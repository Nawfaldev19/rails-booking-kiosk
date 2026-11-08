require "rails_helper"

# Team management: invitations for new accounts (the manager never chooses or
# sees a password), existing accounts joining with their own password, role
# changes, removal, and changing one's own password.
RSpec.describe "Team API" do
  let(:workspace) { create(:workspace, slug: "larkspur", name: "Larkspur") }
  let!(:manager) { create(:user, name: "Robin Manager") }
  let!(:manager_membership) { create(:membership, workspace: workspace, user: manager, role: "manager") }

  def add_team_member(email:, password: nil, name: "New Person", role: "STAFF")
    graphql(<<~GQL, variables: { name: name, email: email, password: password }, workspace: "larkspur").dig("data", "addTeamMember")
      mutation($name: String!, $email: String!, $password: String) {
        addTeamMember(name: $name, email: $email, password: $password, role: #{role}) {
          teamMember { id name email role invitationPending isViewer } errors { code field }
        }
      }
    GQL
  end

  def accept(token, password = "chosen-by-quinn-1")
    graphql(<<~GQL, variables: { token: token, password: password }).dig("data", "acceptInvitation")
      mutation($token: String!, $password: String!) {
        acceptInvitation(token: $token, password: $password) { viewer { user { email } } errors { code field } }
      }
    GQL
  end

  def viewer_email
    graphql("{ viewer { user { email } } }").dig("data", "viewer", "user", "email")
  end

  # The raw token only exists in the invitation message as it was recorded.
  def token_for(email)
    OutboundMessage.about_invitation.where(recipient: email).order(:created_at).last.body[OutboundMessage::LINK_TOKEN]
  end

  describe "inviting a new account" do
    before { sign_in_as(manager) }

    it "creates an account without a password and records an invitation with a one-time link" do
      added = add_team_member(name: "Quinn Example", email: " Quinn@Example.com ")
      expect(added).to match("teamMember" => { "id" => anything, "name" => "Quinn Example", "email" => "quinn@example.com",
                                               "role" => "STAFF", "invitationPending" => true, "isViewer" => false }, "errors" => [])
      quinn = User.find_by!(email: "quinn@example.com")
      expect(quinn).to be_invited
      expect(User.authenticate_by(email: "quinn@example.com", password: "")).to be_nil

      message = OutboundMessage.about_invitation.sole
      expect(message.booking).to be_nil
      expect(message.subject).to eq("You're invited to Larkspur on Booking Kiosk")
      expect(message.body).to match(%r{http://localhost:5173/invitation#token=[A-Za-z0-9_-]{43}})
      expect(Invitation.sole.token_digest).to eq(Invitation.digest(token_for("quinn@example.com")))
      expect(enqueued_jobs.map { |job| job["job_class"] }).to include("DeliverMessageJob")
    end

    it "never shows the token to managers reading the outbox, and drops it once delivered" do
      add_team_member(email: "quinn@example.com")
      body = graphql('{ workspace(slug: "larkspur") { outbox { nodes { kind body } } } }', workspace: "larkspur")
      shown = body.dig("data", "workspace", "outbox", "nodes", 0)
      expect(shown["kind"]).to eq("INVITATION")
      expect(shown["body"]).to include("/invitation#token=hidden")
      expect(shown["body"]).not_to include(token_for("quinn@example.com"))

      message = OutboundMessage.about_invitation.sole
      expect(Messages::Deliver.call(message.id)).to eq(:delivered)
      expect(ActionMailer::Base.deliveries.last.body.to_s).to match(/#token=[A-Za-z0-9_-]{43}/)
      expect(message.reload.body).to include("#token=hidden")
    end

    it "refuses a password chosen by the manager for a new account" do
      refused = add_team_member(email: "quinn@example.com", password: "managers-choice-1")
      expect(refused).to eq("teamMember" => nil, "errors" => [ { "code" => "INVALID_INPUT", "field" => "password" } ])
      expect(User.exists?(email: "quinn@example.com")).to be(false)
    end

    it "refuses the member role and people already in the workspace" do
      expect(add_team_member(email: "q@example.com", role: "MEMBER").dig("errors", 0, "code")).to eq("INVALID_INPUT")
      expect(add_team_member(email: manager.email, password: "correct-horse-1").dig("errors", 0, "code")).to eq("INVALID_STATE")
    end

    it "sends a fresh link to someone whose invitation is still open, and the old link stops working" do
      add_team_member(email: "quinn@example.com")
      first = token_for("quinn@example.com")
      travel 1.second
      again = add_team_member(email: "quinn@example.com")
      expect(again["errors"]).to eq([])
      expect(workspace.memberships.count).to eq(2)
      expect(Invitation.count).to eq(1)
      expect(accept(first).dig("errors", 0, "code")).to eq("NOT_FOUND")
      expect(accept(token_for("quinn@example.com"))["errors"]).to eq([])
    end

    it "limits how many invitations one workspace can send in an hour" do
      codes = Array.new(RateLimiter::INVITATIONS_PER_WORKSPACE + 1) { |i| add_team_member(email: "p#{i}@example.com").dig("errors", 0, "code") }
      expect(codes.compact).to eq([ "RATE_LIMITED" ])
    end

    it "reports two managers adding the same new person at once as a typed error, not a crash" do
      allow(User).to receive(:create!).and_raise(ActiveRecord::RecordNotUnique)
      refused = add_team_member(email: "quinn@example.com")
      expect(refused).to eq("teamMember" => nil, "errors" => [ { "code" => "INVALID_STATE", "field" => "email" } ])
    end
  end

  describe "accepting an invitation" do
    let(:token) do
      sign_in_as(manager)
      add_team_member(name: "Quinn Example", email: "quinn@example.com")
      graphql("mutation { signOut { signedOut } }")
      token_for("quinn@example.com")
    end

    it "sets the password the person chose and signs them in" do
      accepted = accept(token)
      expect(accepted).to eq("viewer" => { "user" => { "email" => "quinn@example.com" } }, "errors" => [])
      expect(viewer_email).to eq("quinn@example.com")
      expect(User.authenticate_by(email: "quinn@example.com", password: "chosen-by-quinn-1")).to be_present
      expect(Invitation.count).to eq(0)
    end

    it "works only once" do
      accept(token)
      graphql("mutation { signOut { signedOut } }")
      expect(accept(token, "someone-else-12")).to eq("viewer" => nil, "errors" => [ { "code" => "NOT_FOUND", "field" => nil } ])
      expect(User.authenticate_by(email: "quinn@example.com", password: "chosen-by-quinn-1")).to be_present
    end

    it "stops working after 72 hours" do
      token
      travel Invitation::LIFETIME + 1.second
      expect(accept(token).dig("errors", 0, "code")).to eq("NOT_FOUND")
    end

    it "rejects unknown tokens and passwords that are too short, without using the link up" do
      expect(accept("not-a-real-token").dig("errors", 0, "code")).to eq("NOT_FOUND")
      expect(accept(token, "short")).to eq("viewer" => nil, "errors" => [ { "code" => "INVALID_INPUT", "field" => "password" } ])
      expect(accept(token)["errors"]).to eq([])
    end

    it "limits attempts per client address" do
      codes = Array.new(RateLimiter::PASSWORD_ATTEMPTS_PER_ADDRESS + 1) { accept("guess-#{_1}").dig("errors", 0, "code") }
      expect(codes.last).to eq("RATE_LIMITED")
    end

    it "keeps an invited account from signing in before it has a password" do
      token
      body = graphql('mutation { signIn(email: "quinn@example.com", password: "") { errors { code } } }')
      expect(body.dig("data", "signIn", "errors", 0, "code")).to eq("INVALID_CREDENTIALS")
    end
  end

  describe "an email that already has an account" do
    before { sign_in_as(manager) }

    let!(:existing) { create(:user, email: "pat@example.com", name: "Pat Elsewhere").tap { |user| create(:membership, user: user) } }

    it "joins only with that account's own password, and reveals nothing otherwise" do
      refused = add_team_member(name: "Ignored", email: "PAT@example.com", password: "guess-guess-1")
      expect(refused).to eq("teamMember" => nil, "errors" => [ { "code" => "INVALID_CREDENTIALS", "field" => "password" } ])
      expect(refused.to_s).not_to include("Elsewhere")
      expect(add_team_member(email: "pat@example.com").dig("errors", 0, "code")).to eq("INVALID_CREDENTIALS")
      expect(existing.memberships.count).to eq(1)

      added = add_team_member(name: "Ignored", email: "PAT@example.com", password: "correct-horse-1")
      expect(added["teamMember"]).to include("name" => "Pat Elsewhere", "email" => "pat@example.com", "invitationPending" => false)
      expect(existing.reload.authenticate("correct-horse-1")).to be_truthy
      expect(OutboundMessage.about_invitation.count).to eq(0)
    end

    it "counts failed password checks against the sign-in limit" do
      codes = Array.new(RateLimiter::PASSWORD_ATTEMPTS_PER_ACCOUNT + 1) { add_team_member(email: "pat@example.com", password: "guess-guess-1").dig("errors", 0, "code") }
      expect(codes.last).to eq("RATE_LIMITED")
    end
  end

  describe "changing roles and removing people" do
    let(:staff_user) { create(:user, name: "Jules Staff") }
    let!(:staff) { create(:membership, workspace: workspace, user: staff_user, role: "staff") }

    def change_role(id, role)
      graphql("mutation($id: ID!) { changeTeamRole(membershipId: $id, role: #{role}) { teamMember { role } errors { code } } }",
        variables: { id: id }, workspace: "larkspur").dig("data", "changeTeamRole")
    end

    def remove(id)
      graphql("mutation($id: ID!) { removeTeamMember(membershipId: $id) { removedId errors { code } } }",
        variables: { id: id }, workspace: "larkspur").dig("data", "removeTeamMember")
    end

    it "lists the team with the viewer marked" do
      sign_in_as(manager)
      team = graphql('{ workspace(slug: "larkspur") { team { name isViewer invitationPending } } }', workspace: "larkspur")
      expect(team.dig("data", "workspace", "team")).to contain_exactly(
        { "name" => "Robin Manager", "isViewer" => true, "invitationPending" => false },
        { "name" => "Jules Staff", "isViewer" => false, "invitationPending" => false }
      )
    end

    it "promotes and demotes someone else" do
      sign_in_as(manager)
      expect(change_role(staff.id, "MANAGER")).to eq("teamMember" => { "role" => "MANAGER" }, "errors" => [])
      expect(change_role(staff.id, "MEMBER")).to eq("teamMember" => { "role" => "MEMBER" }, "errors" => [])
    end

    it "never lets a manager change or remove their own membership, so the last manager stays" do
      sign_in_as(manager)
      expect(change_role(manager_membership.id, "STAFF").dig("errors", 0, "code")).to eq("INVALID_STATE")
      expect(remove(manager_membership.id).dig("errors", 0, "code")).to eq("INVALID_STATE")
      expect(workspace.memberships.manager.count).to eq(1)
    end

    it "removes someone, who loses access at once" do
      sign_in_as(manager)
      expect(remove(staff.id)).to eq("removedId" => staff.id, "errors" => [])
      expect(Membership.exists?(staff.id)).to be(false)
      expect(User.exists?(staff_user.id)).to be(true)

      sign_in_as(staff_user)
      expect(graphql('{ workspace(slug: "larkspur") { daySheet { id } } }').dig("data", "workspace")).to be_nil
    end

    it "deletes an invited account that has nowhere else to go, with its invitation" do
      sign_in_as(manager)
      invited = add_team_member(email: "quinn@example.com").dig("teamMember", "id")
      expect(remove(invited)["errors"]).to eq([])
      expect(User.exists?(email: "quinn@example.com")).to be(false)
      expect(Invitation.count).to eq(0)
    end

    it "keeps people with bookings on record, so they can only be demoted" do
      sign_in_as(manager)
      booker = create(:membership, workspace: workspace, role: "manager")
      create(:booking, machine: create(:machine, workspace: workspace), membership: booker)
      expect(remove(booker.id).dig("errors", 0, "code")).to eq("INVALID_STATE")
      expect(change_role(booker.id, "MEMBER")["errors"]).to eq([])
    end

    it "refuses staff, other workspaces' memberships and unknown IDs" do
      sign_in_as(staff_user)
      expect(remove(manager_membership.id).dig("errors", 0, "code")).to eq("FORBIDDEN")

      graphql("mutation { signOut { signedOut } }")
      sign_in_as(manager)
      elsewhere = create(:membership, role: "staff")
      expect(remove(elsewhere.id).dig("errors", 0, "code")).to eq("NOT_FOUND")
      expect(change_role(SecureRandom.uuid, "STAFF").dig("errors", 0, "code")).to eq("NOT_FOUND")
    end
  end

  describe "changing one's own password" do
    def change_password(current, new_password)
      graphql(<<~GQL, variables: { c: current, n: new_password }).dig("data", "changePassword")
        mutation($c: String!, $n: String!) { changePassword(currentPassword: $c, newPassword: $n) { viewer { user { email } } errors { code field } } }
      GQL
    end

    it "needs the current password and a valid new one" do
      sign_in_as(manager)
      expect(change_password("wrong-wrong-1", "brand-new-pass-1")).to eq(
        "viewer" => nil, "errors" => [ { "code" => "INVALID_CREDENTIALS", "field" => "currentPassword" } ]
      )
      expect(change_password("correct-horse-1", "short")).to eq(
        "viewer" => nil, "errors" => [ { "code" => "INVALID_INPUT", "field" => "newPassword" } ]
      )
      expect(manager.reload.authenticate("correct-horse-1")).to be_truthy
    end

    it "keeps this session, and ends every other session of the account" do
      sign_in_as(manager)
      other_session = cookies["_booking_kiosk_session"]
      expect(change_password("correct-horse-1", "brand-new-pass-1")["errors"]).to eq([])
      expect(viewer_email).to eq(manager.email)
      expect(manager.reload.authenticate("brand-new-pass-1")).to be_truthy

      cookies["_booking_kiosk_session"] = other_session
      expect(viewer_email).to be_nil
    end

    it "asks signed-out callers to sign in" do
      expect(change_password("a", "b").dig("errors", 0, "code")).to eq("UNAUTHENTICATED")
    end
  end
end
