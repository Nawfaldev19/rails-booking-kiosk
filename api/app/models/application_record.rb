# Base class for every Active Record model. Primary keys are UUIDs, so IDs cannot be enumerated.
class ApplicationRecord < ActiveRecord::Base
  primary_abstract_class
end
