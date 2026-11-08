module Mutations
  # Shared shape for mutations that act on one booking and return it.
  class BookingMutation < BaseMutation
    field :booking, Types::BookingType, "The booking after the change; null when `errors` is not empty.", null: true

    private

    # Reloads the booking through the tenant with what the payload renders preloaded.
    #
    # @param booking [Booking]
    # @return [Hash] the payload's `booking` entry.
    def respond_with(booking)
      { booking: tenant!.bookings.includes(:machine, membership: :user).find(booking.id) }
    end
  end
end
