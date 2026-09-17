import React from 'react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookingSummary } from '../components/booking/BookingSummary';
import { PaymentForm } from '../components/booking/PaymentForm';
import { SeatGrid } from '../components/booking/SeatGrid';
import { createBooking } from '../lib/bookingApi';

const booking = {
  id: 7,
  confirmationId: 'BMS-ABC123DEF456',
  movie: { id: 1, title: 'Paradise' },
  theatre: { id: 1, name: 'Sandhya 70mm' },
  seats: ['A1', 'A2', 'A3'],
  paymentMethod: 'Card' as const,
  totalPrice: 450
};

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('SeatGrid', () => {
  it('allows keyboard-accessible seat selection and reports the selected total', async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(<SeatGrid onSelectionChange={onSelectionChange} />);
    await user.click(screen.getByRole('gridcell', { name: 'Seat A1' }));
    await user.click(screen.getByRole('gridcell', { name: 'Seat A2' }));
    expect(screen.getByRole('status')).toHaveTextContent('A1, A2 · Rs. 300');
    expect(onSelectionChange).toHaveBeenLastCalledWith(['A1', 'A2'], 300);
  });
});

describe('PaymentForm', () => {
  it('shows Card fields, validates required values, and processes for exactly two seconds', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(booking);
    render(<PaymentForm onSubmit={onSubmit} />);
    expect(screen.getByLabelText('Card Number')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Pay & confirm' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Card Number, Expiry Date, and CVV');
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Card Number'), '4111111111111111');
    await user.type(screen.getByLabelText('Expiry Date'), '12/30');
    await user.type(screen.getByLabelText('CVV'), '123');
    let processingCallback: (() => void) | undefined;
    const timeoutSpy = vi.spyOn(window, 'setTimeout').mockImplementation((callback) => {
      processingCallback = callback as unknown as () => void;
      return 1 as unknown as number;
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Pay & confirm' }).closest('form') as HTMLFormElement);
    expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
    expect(screen.getByRole('button', { name: 'Processing Payment...' })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
    processingCallback?.();
    await Promise.resolve();
    await Promise.resolve();
    expect(onSubmit).toHaveBeenCalledWith('Card');
  });

  it('switches to UPI, shows the conditional field, and validates its required value', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(booking);
    render(<PaymentForm onSubmit={onSubmit} />);
    await user.click(screen.getByRole('radio', { name: 'UPI' }));
    expect(screen.getByLabelText('UPI ID')).toBeInTheDocument();
    expect(screen.queryByLabelText('Card Number')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Pay & confirm' }));
    expect(screen.getByRole('alert')).toHaveTextContent('UPI ID');
    await user.type(screen.getByLabelText('UPI ID'), 'user@upi');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('booking API and summary', () => {
  it('sends the authenticated backend booking payload', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ booking }), { status: 201 }));
    await expect(createBooking('token-123', { movieId: 1, theatreId: 1, seats: ['A1', 'A2', 'A3'], paymentMethod: 'Card', totalPrice: 450 })).resolves.toEqual(booking);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/bookings', expect.objectContaining({ method: 'POST', body: JSON.stringify({ movieId: 1, theatreId: 1, seats: ['A1', 'A2', 'A3'], paymentMethod: 'Card', totalPrice: 450 }) }));
  });

  it('renders the backend confirmation details rather than frontend-only values', () => {
    render(<BookingSummary booking={booking} />);
    expect(screen.getByText('Paradise')).toBeInTheDocument();
    expect(screen.getByText('Sandhya 70mm')).toBeInTheDocument();
    expect(screen.getByText('A1, A2, A3')).toBeInTheDocument();
    expect(screen.getByText('BMS-ABC123DEF456')).toBeInTheDocument();
  });
});
