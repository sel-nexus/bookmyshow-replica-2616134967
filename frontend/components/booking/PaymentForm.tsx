'use client';

import React, { useState, type FormEvent } from 'react';
import type { Booking, PaymentMethod } from '../../lib/bookingApi';

interface PaymentFormProps {
  onSubmit: (paymentMethod: PaymentMethod) => Promise<Booking>;
}

/** Collects payment details, validates the selected method, and submits after processing. */
export function PaymentForm({ onSubmit }: PaymentFormProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Card');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [upiId, setUpiId] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError('');
    if (paymentMethod === 'Card' && (!cardNumber.trim() || !expiryDate.trim() || !cvv.trim())) {
      setError('Enter your Card Number, Expiry Date, and CVV.');
      return;
    }
    if (paymentMethod === 'UPI' && !upiId.trim()) {
      setError('Enter your UPI ID, for example user@upi.');
      return;
    }
    setIsProcessing(true);
    try {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 2000));
      await onSubmit(paymentMethod);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'The payment could not be completed.');
      setIsProcessing(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="panel-kicker">Payment method</legend>
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          {(['Card', 'UPI'] as const).map((method) => (
            <label key={method} style={{ display: 'flex', gap: 8, alignItems: 'center', fontFamily: 'Arial, sans-serif' }}>
              <input type="radio" name="paymentMethod" value={method} checked={paymentMethod === method} onChange={() => setPaymentMethod(method)} />
              {method}
            </label>
          ))}
        </div>
      </fieldset>
      {paymentMethod === 'Card' ? (
        <>
          <div className="field-group">
            <label htmlFor="card-number">Card Number</label>
            <input
              id="card-number"
              name="cardNumber"
              inputMode="numeric"
              autoComplete="cc-number"
              value={cardNumber}
              onChange={(event) => {
                setCardNumber(event.target.value);
                setError('');
              }}
              aria-required="true"
            />
          </div>
          <div className="field-group">
            <label htmlFor="expiry-date">Expiry Date</label>
            <input
              id="expiry-date"
              name="expiryDate"
              placeholder="MM/YY"
              autoComplete="cc-exp"
              value={expiryDate}
              onChange={(event) => {
                setExpiryDate(event.target.value);
                setError('');
              }}
              aria-required="true"
            />
          </div>
          <div className="field-group">
            <label htmlFor="cvv">CVV</label>
            <input
              id="cvv"
              name="cvv"
              inputMode="numeric"
              autoComplete="cc-csc"
              value={cvv}
              onChange={(event) => {
                setCvv(event.target.value);
                setError('');
              }}
              aria-required="true"
            />
          </div>
        </>
      ) : (
        <div className="field-group">
          <label htmlFor="upi-id">UPI ID</label>
          <input
            id="upi-id"
            name="upiId"
            placeholder="user@upi"
            autoComplete="off"
            value={upiId}
            onChange={(event) => {
              setUpiId(event.target.value);
              setError('');
            }}
            aria-required="true"
          />
          <span className="field-hint">Example: user@upi</span>
        </div>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button" type="submit" disabled={isProcessing} aria-busy={isProcessing}>
        {isProcessing ? 'Processing Payment...' : 'Pay & confirm'}
      </button>
    </form>
  );
}
