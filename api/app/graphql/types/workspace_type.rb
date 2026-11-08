module Types
  # A workspace as seen by one of its members. Every field reads through the
  # request's Tenant, so nothing here can reach another workspace's data.
  #
  # Each field checks the viewer's role with `tenant!.authorize!` before reading;
  # a role that may not see a field gets a FORBIDDEN GraphQL error.
  class WorkspaceType < BaseObject
    graphql_name "Workspace"
    description "A makerspace, as seen by one of its members."

    field :id, ID, "Opaque identifier (a UUID).", null: false
    field :name, String, "Display name.", null: false
    field :slug, String, "URL-safe identifier used in `/w/:slug`.", null: false
    field :time_zone, String, "IANA time zone used for opening hours and day boundaries.", null: false
    field :opens_at, String, "Local opening time, HH:MM.", null: false
    field :closes_at, String, "Local closing time, HH:MM.", null: false
    field :hold_minutes, Integer, "How long a hold lasts before it lapses, unless the slot starts sooner.", null: false
    field :max_active_holds, Integer, "How many open holds one member may have at once.", null: false
    field :booking_horizon_days, Integer, "How many days can be booked, counting today.", null: false
    field :today, GraphQL::Types::ISO8601Date, "Today's date in the workspace's time zone.", null: false
    field :viewer_role, RoleEnum, "The viewer's role in this workspace.", null: false

    field :machines, [ MachineType ], "Machines by name. Every role may read them.", null: false do
      argument :include_retired, Boolean, "Also list retired machines.", required: false, default_value: false
    end
    field :availability, [ MachineDayType ], "Slot grid for one day within the booking horizon.", null: false do
      argument :date, GraphQL::Types::ISO8601Date,
        "A date from today up to `bookingHorizonDays - 1` days ahead; others fail with INVALID_INPUT.", required: true
    end
    field :my_bookings, BookingType.connection_type,
      "The viewer's confirmed and cancelled bookings and open holds. Expired holds are left out. Members and managers.", null: false do
      argument :upcoming, Boolean, "True for future bookings (soonest first), false for past ones (latest first).",
        required: false, default_value: true
    end
    field :my_holds, [ BookingType ], "The viewer's open holds, soonest slot first. Members and managers.", null: false
    field :day_sheet, [ BookingType ], "Today's confirmed bookings, for the front desk. Staff and managers.", null: false
    field :message_templates, [ MessageTemplateType ], "One template per message kind. Managers only.", null: false
    field :message_preview, MessagePreviewType, "Renders a draft template with sample values. Managers only.", null: false do
      argument :kind, MessageKindEnum, "Whose built-in default the preview falls back to.", required: true
      argument :subject, String, "Liquid source of the draft subject, up to 160 characters.", required: true
      argument :body, String, "Liquid source of the draft body, up to 5,000 characters.", required: true
    end
    field :outbox, OutboundMessageType.connection_type,
      "Recorded messages, newest first. Paged by (created_at, id), so new messages never shift a later page. Managers only.",
      null: false
    field :utilisation, [ MachineUsageType ], "Confirmed hours per machine in service over the last 14 days. Managers only.", null: false
    field :team, [ StaffMemberType ], "Staff and managers, including invited people who have not chosen a password yet. Managers only.", null: false

    # @return [String] opening time as HH:MM.
    def opens_at = format_minute(object.opens_at_minute)
    # @return [String] closing time as HH:MM.
    def closes_at = format_minute(object.closes_at_minute)
    # @return [Date] today in the workspace's zone.
    def today = object.today
    # @return [String] the viewer's role.
    def viewer_role = tenant!.role
    # @return [Integer] {Workspace::BOOKING_HORIZON_DAYS}.
    def booking_horizon_days = Workspace::BOOKING_HORIZON_DAYS

    # @param include_retired [Boolean]
    # @return [ActiveRecord::Relation<Machine>]
    # @raise [DomainError] FORBIDDEN without the :view_catalogue capability.
    def machines(include_retired:)
      tenant!.authorize!(:view_catalogue)
      scope = include_retired ? tenant!.machines : tenant!.machines.in_service
      scope.order(:name)
    end

    # @param date [Date] a date inside the booking horizon.
    # @return [Array<Bookings::Availability::MachineDay>]
    # @raise [DomainError] INVALID_INPUT outside the horizon; FORBIDDEN for a role without :view_catalogue.
    def availability(date:)
      Bookings::Availability.new(tenant: tenant!, date: date).call
    end

    # @param upcoming [Boolean] future bookings soonest first, or past ones latest first.
    # @return [ActiveRecord::Relation<Booking>] paginated by the connection.
    # @raise [DomainError] FORBIDDEN for staff.
    def my_bookings(upcoming:)
      tenant!.authorize!(:book)
      now = Time.current
      scope = tenant!.own_bookings.listed_for_member(now).includes(:machine, membership: :user)
      if upcoming
        scope.where("upper(period) > ?", now).order(Arel.sql("lower(period) ASC"), :id)
      else
        scope.where("upper(period) <= ?", now).order(Arel.sql("lower(period) DESC"), :id)
      end
    end

    # @return [ActiveRecord::Relation<Booking>] open holds only.
    # @raise [DomainError] FORBIDDEN for staff.
    def my_holds
      tenant!.authorize!(:book)
      tenant!.own_bookings.open_holds(Time.current).includes(:machine, membership: :user).chronological
    end

    # @return [ActiveRecord::Relation<Booking>] today's confirmed bookings, by start time.
    # @raise [DomainError] FORBIDDEN for members.
    def day_sheet
      tenant!.authorize!(:view_day_sheet)
      tenant!.bookings.confirmed
        .starting_within(object.day_window(object.today))
        .includes(:machine, membership: :user)
        .chronological
    end

    # @return [Array<Hash>] one entry per kind: the saved template or the built-in default.
    # @raise [DomainError] FORBIDDEN unless manager.
    def message_templates
      tenant!.authorize!(:manage_messages)
      saved = tenant!.message_templates.index_by(&:kind)
      MessageTemplate.kinds.keys.map do |kind|
        record = saved[kind]
        default = MessageRenderer::DEFAULTS.fetch(kind)
        {
          kind: kind,
          subject: record&.subject || default[:subject],
          body: record&.body || default[:body],
          customised: record.present?
        }
      end
    end

    # Renders an unsaved draft; nothing is written.
    #
    # @param kind [String] the message kind whose default is the fallback.
    # @param subject [String] Liquid source.
    # @param body [String] Liquid source.
    # @return [Hash] subject, body and problems.
    # @raise [DomainError] FORBIDDEN unless manager; INVALID_INPUT when the draft is longer than a template may be.
    def message_preview(kind:, subject:, body:)
      tenant!.authorize!(:manage_messages)
      # Checked before any parsing, so preview input is bounded exactly like a saved template.
      if subject.length > MessageRenderer::MAX_SUBJECT_LENGTH || body.length > MessageRenderer::MAX_BODY_LENGTH
        raise DomainError.new("INVALID_INPUT",
          "Subjects can be up to #{MessageRenderer::MAX_SUBJECT_LENGTH} characters and bodies up to #{MessageRenderer::MAX_BODY_LENGTH}.")
      end
      draft = MessageTemplate.new(subject: subject, body: body)
      rendered = MessageRenderer.render(kind: kind, template: draft, variables: MessageRenderer::SAMPLE)
      { subject: rendered.subject, body: rendered.body, problems: rendered.problems }
    end

    # @return [Connections::NewestFirstConnection] newest first, keyset-paged.
    # @raise [DomainError] FORBIDDEN unless manager.
    def outbox
      tenant!.authorize!(:manage_messages)
      Connections::NewestFirstConnection.new(tenant!.outbound_messages.newest_first)
    end

    # @return [Array<Hash>] machine, booked hours and booking count for each machine in service.
    # @raise [DomainError] FORBIDDEN unless manager.
    def utilisation
      tenant!.authorize!(:view_utilisation)
      now = Time.current
      totals = tenant!.bookings.confirmed
        .where("lower(period) >= ? AND lower(period) < ?", now - 14.days, now)
        .group(:machine_id)
        .pluck(:machine_id, Arel.sql("SUM(EXTRACT(EPOCH FROM upper(period) - lower(period))) / 3600.0"), Arel.sql("COUNT(*)"))
        .to_h { |machine_id, hours, count| [ machine_id, [ hours.to_f, count ] ] }
      tenant!.machines.in_service.order(:name).map do |machine|
        hours, count = totals.fetch(machine.id, [ 0.0, 0 ])
        { machine: machine, booked_hours: hours.round(1), booking_count: count }
      end
    end

    # @return [ActiveRecord::Relation<Membership>] staff and manager memberships.
    # @raise [DomainError] FORBIDDEN unless manager.
    def team
      tenant!.authorize!(:manage_staff)
      tenant!.memberships.where(role: %w[staff manager]).includes(:user).order(:role, :created_at)
    end

    private

    def format_minute(minute)
      format("%02d:%02d", minute / 60, minute % 60)
    end
  end
end
