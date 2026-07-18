import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Public lookup of a booking by its QR code string.
 * The QR code is a random UUID minted at booking-create time; anyone who
 * scans a printed QR can view the trip's public details (who booked, host,
 * vehicle, pickup/return times, amount paid). Safe fields only — no phone,
 * no address, no email.
 */
export const getBookingByQr = createServerFn({ method: "GET" })
  .inputValidator((raw) => z.object({ code: z.string().min(8).max(128) }).parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .select(
        "id, status, payment_status, start_date, end_date, pickup_time, dropoff_time, total_price, paid_at, vehicle_id, customer_id, vendor_id",
      )
      .eq("qr_code", data.code)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!booking) return null;

    const [{ data: vehicle }, { data: customer }, { data: vendor }] = await Promise.all([
      supabaseAdmin.from("vehicles").select("title, brand, model, year, city, category, fuel, transmission").eq("id", booking.vehicle_id).maybeSingle(),
      supabaseAdmin.from("profiles").select("full_name, avatar_url").eq("id", booking.customer_id).maybeSingle(),
      supabaseAdmin.from("profiles").select("full_name, avatar_url").eq("id", booking.vendor_id).maybeSingle(),
    ]);

    return {
      id: booking.id,
      status: booking.status,
      paymentStatus: booking.payment_status,
      startDate: booking.start_date,
      endDate: booking.end_date,
      pickupTime: booking.pickup_time,
      dropoffTime: booking.dropoff_time,
      totalPrice: Number(booking.total_price),
      paidAt: booking.paid_at,
      vehicle,
      customer,
      vendor,
    };
  });
