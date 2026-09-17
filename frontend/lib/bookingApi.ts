export type PaymentMethod = 'Card' | 'UPI';

export interface CreateBookingRequest {
  movieId: number;
  theatreId: number;
  seats: string[];
  paymentMethod: PaymentMethod;
  totalPrice: number;
}

export interface Booking {
  id: number;
  confirmationId: string;
  movie: { id: number; title: string };
  theatre: { id: number; name: string };
  seats: string[];
  paymentMethod: PaymentMethod;
  totalPrice: number;
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? '';

/** Creates a booking through the authenticated backend endpoint. */
export async function createBooking(token: string, input: CreateBookingRequest): Promise<Booking> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/api/v1/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      credentials: 'include',
      body: JSON.stringify(input)
    });
  } catch {
    throw new Error('Unable to reach the cinema service. Please try again.');
  }
  const body = (await response.json().catch(() => ({}))) as { booking?: Booking; error?: string };
  if (!response.ok || !body.booking) throw new Error(body.error ?? 'The booking could not be completed.');
  return body.booking;
}

/** Retrieves the persisted booking for the authenticated confirmation owner. */
export async function getBooking(token: string, confirmationId: string): Promise<Booking> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/api/v1/bookings/${encodeURIComponent(confirmationId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include'
    });
  } catch {
    throw new Error('Unable to reach the cinema service. Please try again.');
  }
  const body = (await response.json().catch(() => ({}))) as { booking?: Booking; error?: string };
  if (!response.ok || !body.booking) throw new Error(body.error ?? 'The booking could not be loaded.');
  return body.booking;
}
