import React from 'react';
import type { Booking } from '../../lib/bookingApi';

interface BookingSummaryProps {
  booking: Booking;
}

/** Presents the backend-confirmed booking details in a compact summary. */
export function BookingSummary({ booking }: BookingSummaryProps) {
  return (
    <dl className="panel-list" aria-label="Booking summary">
      <div><dt>Movie</dt><dd>{booking.movie.title}</dd></div>
      <div><dt>Theatre</dt><dd>{booking.theatre.name}</dd></div>
      <div><dt>Seats</dt><dd>{booking.seats.join(', ')}</dd></div>
      <div><dt>Confirmation ID</dt><dd>{booking.confirmationId}</dd></div>
      <div><dt>Total</dt><dd>Rs. {booking.totalPrice}</dd></div>
    </dl>
  );
}
