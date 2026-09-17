'use client';

import React, { useState } from 'react';

interface SeatGridProps {
  onSelectionChange?: (seats: string[], totalPrice: number) => void;
}

const rows = ['A', 'B', 'C', 'D', 'E'];
const seatsPerRow = 8;
const pricePerSeat = 150;

/** Renders a keyboard-accessible cinema seat grid with deterministic A-row selection. */
export function SeatGrid({ onSelectionChange }: SeatGridProps) {
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  function toggleSeat(seat: string): void {
    setSelectedSeats((current) => {
      const next = current.includes(seat) ? current.filter((item) => item !== seat) : [...current, seat];
      onSelectionChange?.(next, next.length * pricePerSeat);
      return next;
    });
  }

  return (
    <fieldset aria-label="Select your seats">
      <legend className="panel-kicker">Choose your seats · Rs. {pricePerSeat} each</legend>
      <div role="grid" aria-label="Cinema seat map" style={{ display: 'grid', gap: 8, marginTop: 20 }}>
        {rows.map((row) => (
          <div key={row} role="row" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span aria-hidden="true" style={{ width: 20, fontWeight: 700 }}>{row}</span>
            {Array.from({ length: seatsPerRow }, (_, index) => `${row}${index + 1}`).map((seat) => {
              const selected = selectedSeats.includes(seat);
              return (
                <button
                  key={seat}
                  type="button"
                  role="gridcell"
                  aria-label={`Seat ${seat}`}
                  aria-pressed={selected}
                  onClick={() => toggleSeat(seat)}
                  style={{ minWidth: 42, padding: '10px 6px', border: selected ? '2px solid var(--cinema)' : '1px solid var(--line)', borderRadius: 8, color: selected ? 'white' : 'var(--ink)', background: selected ? 'var(--cinema)' : 'white' }}
                >
                  {seat}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <p role="status" aria-live="polite" style={{ marginTop: 18 }}>
        {selectedSeats.length ? `${selectedSeats.join(', ')} · Rs. ${selectedSeats.length * pricePerSeat}` : 'No seats selected'}
      </p>
    </fieldset>
  );
}
