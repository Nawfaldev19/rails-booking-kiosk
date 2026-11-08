require "rails_helper"

RSpec.describe MessageRenderer do
  let(:variables) { MessageRenderer::SAMPLE }

  it "renders allow-listed variables" do
    template = MessageTemplate.new(subject: "Hi {{ member.name }}", body: "{{ machine.name }} at {{ booking.starts_at }}")
    rendered = described_class.render(kind: "booking_confirmed", template: template, variables: variables)
    expect(rendered.subject).to eq("Hi Robin Example")
    expect(rendered.body).to eq("Laser cutter at 14:00")
    expect(rendered.used_fallback).to be(false)
  end

  it "falls back to the default when a template references unknown data" do
    template = MessageTemplate.new(subject: "Hi {{ member.password }}", body: "ok")
    rendered = described_class.render(kind: "booking_confirmed", template: template, variables: variables)
    expect(rendered.used_fallback).to be(true)
    expect(rendered.subject).to eq("Booked: Laser cutter on Sunday 18 October")
    expect(rendered.problems.join).to include("password")
  end

  it "reports syntax errors and unknown filters" do
    expect(described_class.check(subject: "{% if %}", body: "x")).not_to be_empty
    expect(described_class.check(subject: "x", body: "{{ member.name | shell }}")).not_to be_empty
    expect(described_class.check(subject: "Hi", body: "{{ member.name | upcase }}")).to eq([])
  end

  it "offers only branching tags, so a template cannot loop, assign or include" do
    expect(described_class.check(subject: "x", body: "{% if member.name %}Hi{% else %}Hello{% endif %}")).to eq([])
    %w[for assign capture include render cycle tablerow].each do |tag|
      problems = described_class.check(subject: "x", body: "{% #{tag} a in b %}{% end#{tag} %}")
      expect(problems.join).to match(/Unknown tag '#{tag}'/), "expected #{tag} to be refused"
    end
  end

  it "refuses ranges quickly instead of building them (a loop or filter bomb)" do
    bombs = [
      "{% for i in (1..999999999) %}{% endfor %}",
      "{{ (1..999999999) | join }}",
      "{% if (1..999999999) contains 3 %}x{% endif %}"
    ]
    started = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    bombs.each { |body| expect(described_class.check(subject: "x", body: body).join).to include("Ranges") }
    expect(Process.clock_gettime(Process::CLOCK_MONOTONIC) - started).to be < 1
    expect(described_class.check(subject: "x", body: "Wait... {{ member.name }}... then go")).to eq([])
  end

  # 4,000 unclosed "{{" took 0.14 s with the earlier backtracking pattern and
  # grew with the square of the length; the check is linear, so even inputs far
  # past the 5,000-character limit stay in the low milliseconds.
  it "detects ranges in time linear in the template length" do
    hostile = [ "{{" * 50_000, "{%" * 50_000, "{{ x" * 25_000, ("{{ a }}" * 10_000) + "{{ (1..9) }}" ]
    started = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    results = hostile.map { |source| described_class.range_in_markup?(source) }
    expect(Process.clock_gettime(Process::CLOCK_MONOTONIC) - started).to be < 0.5
    expect(results).to eq([ false, false, false, true ])
    expect(described_class.range_in_markup?("{{ 1..")).to be(true)
    expect(described_class.range_in_markup?("{% if a %}..{% endif %}")).to be(false)
  end

  it "checks a maximum-length hostile template quickly" do
    started = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    described_class.check(subject: "{{" * 80, body: "{{" * 2_500)
    described_class.check(subject: "{%" * 80, body: "{% if a %}" * 500)
    expect(Process.clock_gettime(Process::CLOCK_MONOTONIC) - started).to be < 1
  end

  it "uses the default when the workspace has no template" do
    rendered = described_class.render(kind: "booking_cancelled", template: nil, variables: variables)
    expect(rendered.subject).to start_with("Cancelled: Laser cutter")
    expect(rendered.used_fallback).to be(false)
  end
end

RSpec.describe MessageTemplate do
  it "rejects templates that would not render" do
    template = build(:workspace).message_templates.build(kind: "booking_confirmed", subject: "{{ nope }}", body: "x")
    expect(template).not_to be_valid
  end

  it "does not render a template that is already too long" do
    expect(MessageRenderer).not_to receive(:check)
    template = build(:workspace).message_templates.build(kind: "booking_confirmed", subject: "x", body: "{{" * 2_501)
    expect(template).not_to be_valid
  end
end

RSpec.describe Messages::Deliver do
  let(:booking) { create(:booking) }
  let(:message) { Messages::Enqueue.call(booking: booking, kind: "booking_confirmed") }

  it "records a rendered snapshot in the outbox" do
    expect(message).to have_attributes(status: "pending", recipient: booking.membership.user.email,
      subject: "Booked: #{booking.machine.name} on Wednesday 11 March")
  end

  it "delivers once, even if called twice" do
    expect(described_class.call(message.id)).to eq(:delivered)
    expect(described_class.call(message.id)).to eq(:skipped)
    expect(ActionMailer::Base.deliveries.size).to eq(1)
    expect(message.reload).to have_attributes(status: "delivered", attempts: 1)
  end

  it "claims the message before sending, so the send runs outside any transaction" do
    open_transactions = nil
    allow(MessageMailer).to receive(:outbound).and_wrap_original do |original, *args|
      open_transactions = OutboundMessage.connection.open_transactions
      expect(message.reload).to have_attributes(attempts: 1, next_attempt_at: now + OutboundMessage::SEND_LEASE)
      original.call(*args)
    end
    baseline = OutboundMessage.connection.open_transactions
    expect(described_class.call(message.id)).to eq(:delivered)
    expect(open_transactions).to eq(baseline)
  end

  it "backs off between failed attempts, then marks the message failed after the last one" do
    allow(MessageMailer).to receive(:outbound).and_raise(Net::SMTPServerBusy, "busy")
    clock = now
    (1...OutboundMessage::MAX_ATTEMPTS).each do |attempt|
      expect(described_class.call(message.id, now: clock)).to eq(:retry_later)
      wait = OutboundMessage.retry_delay(attempt)
      expect(message.reload).to have_attributes(status: "pending", attempts: attempt, next_attempt_at: clock + wait)
      expect(described_class.call(message.id, now: clock + wait - 1.second)).to eq(:skipped)
      clock += wait
    end
    expect(described_class.call(message.id, now: clock)).to eq(:failed)
    expect(message.reload).to have_attributes(status: "failed", attempts: OutboundMessage::MAX_ATTEMPTS)
    expect(message.last_error).to include("busy")
    expect(OutboundMessage.retry_delay(4)).to eq(8.minutes)
  end
end
