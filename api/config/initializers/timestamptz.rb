# Store every datetime column as `timestamp with time zone`, so a value means
# the same instant whatever the database server's TimeZone setting is. The
# booking `period` is a tstzrange for the same reason.
ActiveSupport.on_load(:active_record_postgresqladapter) do
  self.datetime_type = :timestamptz
end
