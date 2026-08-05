
-- Helper: create a notification row
CREATE OR REPLACE FUNCTION public.notify_user(_user_id uuid, _title text, _body text, _link text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.notifications (user_id, title, body, link)
  VALUES (_user_id, _title, _body, _link);
END; $$;
REVOKE ALL ON FUNCTION public.notify_user(uuid, text, text, text) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_admins(_title text, _body text, _link text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, body, link)
  SELECT ur.user_id, _title, _body, _link FROM public.user_roles ur WHERE ur.role = 'admin';
END; $$;
REVOKE ALL ON FUNCTION public.notify_admins(text, text, text) FROM anon, authenticated;

-- Vehicle rental bookings
CREATE OR REPLACE FUNCTION public.tg_notify_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_title text;
BEGIN
  SELECT title INTO v_title FROM public.vehicles WHERE id = NEW.vehicle_id;

  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_user(NEW.vendor_id, 'New booking request',
      COALESCE(v_title,'Your vehicle') || ' · ' || NEW.start_date || ' → ' || NEW.end_date, '/vendor');
    PERFORM public.notify_user(NEW.customer_id, 'Booking requested',
      'Waiting for the host to accept ' || COALESCE(v_title,'the vehicle') || '.', '/bookings');
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'confirmed' THEN
      PERFORM public.notify_user(NEW.customer_id, 'Booking approved',
        COALESCE(v_title,'Your vehicle') || ' is confirmed. Complete the payment to lock it in.', '/bookings');
    ELSIF NEW.status = 'rejected' THEN
      PERFORM public.notify_user(NEW.customer_id, 'Booking declined',
        'The host could not accept your request for ' || COALESCE(v_title,'this vehicle') || '.', '/bookings');
    ELSIF NEW.status = 'cancelled' THEN
      PERFORM public.notify_user(NEW.customer_id, 'Booking cancelled', 'Your trip was cancelled.', '/bookings');
      PERFORM public.notify_user(NEW.vendor_id, 'Booking cancelled', 'A trip on ' || COALESCE(v_title,'your vehicle') || ' was cancelled.', '/vendor');
    ELSIF NEW.status = 'completed' THEN
      PERFORM public.notify_user(NEW.customer_id, 'Trip completed', 'Rate your ride and view your invoice.', '/bookings');
      PERFORM public.notify_user(NEW.vendor_id, 'Trip completed', COALESCE(v_title,'Your vehicle') || ' is back. Earnings updated.', '/vendor');
    END IF;
  END IF;

  IF NEW.payment_status = 'paid' AND OLD.payment_status IS DISTINCT FROM 'paid' THEN
    PERFORM public.notify_user(NEW.vendor_id, 'Payment received',
      'Payment of Rs ' || NEW.total_price || ' received for ' || COALESCE(v_title,'your vehicle') || '.', '/vendor');
    PERFORM public.notify_user(NEW.customer_id, 'Payment successful',
      'Your booking is confirmed. Show your QR at pickup.', '/bookings');
  END IF;

  IF NEW.pickup_checked_at IS NOT NULL AND OLD.pickup_checked_at IS NULL THEN
    PERFORM public.notify_user(NEW.customer_id, 'Pickup confirmed', 'Handover verified by QR. Drive safe!', '/bookings/' || NEW.id || '/trip');
    PERFORM public.notify_user(NEW.vendor_id, 'Pickup confirmed', 'QR check-in completed for ' || COALESCE(v_title,'your vehicle') || '.', '/vendor');
  END IF;

  IF NEW.return_checked_at IS NOT NULL AND OLD.return_checked_at IS NULL THEN
    PERFORM public.notify_user(NEW.customer_id, 'Return confirmed', 'Vehicle returned and verified by QR.', '/bookings/' || NEW.id || '/trip');
    PERFORM public.notify_user(NEW.vendor_id, 'Return confirmed', 'QR check-out completed for ' || COALESCE(v_title,'your vehicle') || '.', '/vendor');
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_booking_ins ON public.bookings;
CREATE TRIGGER trg_notify_booking_ins AFTER INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_booking();
DROP TRIGGER IF EXISTS trg_notify_booking_upd ON public.bookings;
CREATE TRIGGER trg_notify_booking_upd AFTER UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_booking();

-- Driver hires
CREATE OR REPLACE FUNCTION public.tg_notify_driver_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_user(NEW.driver_id, 'New hire request',
      'A rider wants you on ' || NEW.start_date || ' at ' || NEW.start_time || '.', '/driver-dashboard');
    PERFORM public.notify_user(NEW.customer_id, 'Hire requested', 'Waiting for the driver to accept.', '/hires');
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'confirmed' THEN
      PERFORM public.notify_user(NEW.customer_id, 'Driver accepted', 'Complete the payment to confirm your driver.', '/hires');
    ELSIF NEW.status = 'rejected' THEN
      PERFORM public.notify_user(NEW.customer_id, 'Driver declined', 'Try another driver for your trip.', '/drivers');
    ELSIF NEW.status = 'cancelled' THEN
      PERFORM public.notify_user(NEW.customer_id, 'Hire cancelled',
        CASE WHEN NEW.refund_amount > 0 THEN 'Refund of Rs ' || NEW.refund_amount || ' credited to your wallet.' ELSE 'Your driver hire was cancelled.' END, '/hires');
      PERFORM public.notify_user(NEW.driver_id, 'Hire cancelled', 'A hire on your calendar was cancelled.', '/driver-dashboard');
    ELSIF NEW.status = 'completed' THEN
      PERFORM public.notify_user(NEW.customer_id, 'Hire completed', 'Rate your driver and view your invoice.', '/hires');
    END IF;
  END IF;

  IF NEW.payment_status = 'paid' AND OLD.payment_status IS DISTINCT FROM 'paid' THEN
    PERFORM public.notify_user(NEW.driver_id, 'Payment received', 'Rs ' || NEW.total_price || ' credited for your hire.', '/driver-dashboard');
    PERFORM public.notify_user(NEW.customer_id, 'Payment successful', 'Your driver is confirmed.', '/hires');
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_driver_booking_ins ON public.driver_bookings;
CREATE TRIGGER trg_notify_driver_booking_ins AFTER INSERT ON public.driver_bookings
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_driver_booking();
DROP TRIGGER IF EXISTS trg_notify_driver_booking_upd ON public.driver_bookings;
CREATE TRIGGER trg_notify_driver_booking_upd AFTER UPDATE ON public.driver_bookings
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_driver_booking();

-- Wash bookings
CREATE OR REPLACE FUNCTION public.tg_notify_wash_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_admins('New wash request',
      NEW.city || ' · ' || NEW.slot_date || ' ' || NEW.slot_time || ' — assign a washer partner.', '/admin');
    PERFORM public.notify_user(NEW.customer_id, 'Wash requested', 'Our team is checking washer availability.', '/washes');
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'confirmed' THEN
      PERFORM public.notify_user(NEW.customer_id, 'Wash slot approved', 'Pay now to confirm your doorstep wash.', '/washes');
    ELSIF NEW.status = 'rejected' THEN
      PERFORM public.notify_user(NEW.customer_id, 'Wash slot unavailable',
        COALESCE(NEW.rejection_reason, 'No washer partner is free for that slot.'), '/wash');
    ELSIF NEW.status = 'cancelled' THEN
      PERFORM public.notify_user(NEW.customer_id, 'Wash cancelled',
        CASE WHEN NEW.refund_amount > 0 THEN 'Refund of Rs ' || NEW.refund_amount || ' credited to your wallet.' ELSE 'Your wash booking was cancelled.' END, '/washes');
    ELSIF NEW.status = 'completed' THEN
      PERFORM public.notify_user(NEW.customer_id, 'Wash completed', 'Your vehicle is sparkling. View your invoice.', '/washes');
    END IF;
  END IF;

  IF NEW.payment_status = 'paid' AND OLD.payment_status IS DISTINCT FROM 'paid' THEN
    PERFORM public.notify_user(NEW.customer_id, 'Wash payment successful', 'Your slot is locked in.', '/washes');
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_wash_ins ON public.wash_bookings;
CREATE TRIGGER trg_notify_wash_ins AFTER INSERT ON public.wash_bookings
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_wash_booking();
DROP TRIGGER IF EXISTS trg_notify_wash_upd ON public.wash_bookings;
CREATE TRIGGER trg_notify_wash_upd AFTER UPDATE ON public.wash_bookings
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_wash_booking();

-- Chat messages
CREATE OR REPLACE FUNCTION public.tg_notify_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b RECORD; target uuid;
BEGIN
  SELECT customer_id, vendor_id INTO b FROM public.bookings WHERE id = NEW.booking_id;
  IF b IS NULL THEN RETURN NEW; END IF;
  target := CASE WHEN NEW.sender_id = b.customer_id THEN b.vendor_id ELSE b.customer_id END;
  PERFORM public.notify_user(target, 'New message',
    COALESCE(left(NEW.body, 120), 'Sent a photo'), '/messages/' || NEW.booking_id);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_message ON public.messages;
CREATE TRIGGER trg_notify_message AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_message();

-- Vehicle verification
CREATE OR REPLACE FUNCTION public.tg_notify_vehicle_verification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_admins('New vehicle awaiting review', NEW.title || ' · ' || NEW.city, '/admin');
    RETURN NEW;
  END IF;
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    IF NEW.verification_status = 'approved' THEN
      PERFORM public.notify_user(NEW.vendor_id, 'Vehicle approved', NEW.title || ' is now live on Synchoo.', '/vendor');
    ELSIF NEW.verification_status = 'rejected' THEN
      PERFORM public.notify_user(NEW.vendor_id, 'Vehicle rejected',
        COALESCE(NEW.rejection_reason, 'Please re-upload clearer documents.'), '/vendor');
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_vehicle_ins ON public.vehicles;
CREATE TRIGGER trg_notify_vehicle_ins AFTER INSERT ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_vehicle_verification();
DROP TRIGGER IF EXISTS trg_notify_vehicle_upd ON public.vehicles;
CREATE TRIGGER trg_notify_vehicle_upd AFTER UPDATE ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_vehicle_verification();

-- Host KYC
CREATE OR REPLACE FUNCTION public.tg_notify_vendor_kyc()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status THEN
    IF NEW.kyc_status = 'pending' THEN
      PERFORM public.notify_admins('Host ID awaiting review', NEW.business_name, '/admin');
      PERFORM public.notify_user(NEW.id, 'Document submitted', 'Our team is reviewing your identity proof.', '/vendor');
    ELSIF NEW.kyc_status = 'approved' THEN
      PERFORM public.notify_user(NEW.id, 'You are a verified host', 'You can now publish listings.', '/vendor');
    ELSIF NEW.kyc_status = 'rejected' THEN
      PERFORM public.notify_user(NEW.id, 'Identity check failed', 'Please upload a clearer government ID.', '/vendor');
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_vendor_kyc ON public.vendors;
CREATE TRIGGER trg_notify_vendor_kyc AFTER UPDATE ON public.vendors
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_vendor_kyc();

-- Driver licence verification
CREATE OR REPLACE FUNCTION public.tg_notify_driver_verification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_admins('New driver awaiting review', NEW.full_name || ' · ' || NEW.city, '/admin');
    RETURN NEW;
  END IF;
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    IF NEW.verification_status = 'approved' THEN
      PERFORM public.notify_user(NEW.id, 'Driver profile approved', 'Riders can now hire you.', '/driver-dashboard');
    ELSIF NEW.verification_status = 'rejected' THEN
      PERFORM public.notify_user(NEW.id, 'Driver profile rejected',
        COALESCE(NEW.rejection_reason, 'Please re-submit your licence documents.'), '/driver-dashboard');
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_driver_ins ON public.drivers;
CREATE TRIGGER trg_notify_driver_ins AFTER INSERT ON public.drivers
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_driver_verification();
DROP TRIGGER IF EXISTS trg_notify_driver_upd ON public.drivers;
CREATE TRIGGER trg_notify_driver_upd AFTER UPDATE ON public.drivers
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_driver_verification();

-- Rider licence verification
CREATE OR REPLACE FUNCTION public.tg_notify_profile_dl()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.dl_status IS DISTINCT FROM OLD.dl_status THEN
    IF NEW.dl_status = 'pending' THEN
      PERFORM public.notify_admins('Licence awaiting review', COALESCE(NEW.full_name, 'A rider') || ' submitted a driving licence.', '/admin');
      PERFORM public.notify_user(NEW.id, 'Licence submitted', 'We will verify it shortly.', '/profile');
    ELSIF NEW.dl_status = 'approved' THEN
      PERFORM public.notify_user(NEW.id, 'Licence approved', 'You can now book vehicles on Synchoo.', '/browse');
    ELSIF NEW.dl_status = 'rejected' THEN
      PERFORM public.notify_user(NEW.id, 'Licence rejected',
        COALESCE(NEW.dl_rejection_reason, 'Please upload clearer licence photos.'), '/profile');
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_profile_dl ON public.profiles;
CREATE TRIGGER trg_notify_profile_dl AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_profile_dl();

-- Wallet movements
CREATE OR REPLACE FUNCTION public.tg_notify_wallet()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_user(NEW.user_id,
    CASE WHEN NEW.amount >= 0 THEN 'Wallet credited Rs ' || NEW.amount ELSE 'Wallet debited Rs ' || abs(NEW.amount) END,
    COALESCE(NEW.description, NEW.kind) || ' · Balance Rs ' || NEW.balance_after, '/wallet');
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_wallet ON public.wallet_transactions;
CREATE TRIGGER trg_notify_wallet AFTER INSERT ON public.wallet_transactions
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_wallet();

-- Disputes
CREATE OR REPLACE FUNCTION public.tg_notify_dispute()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_admins('New dispute raised', NEW.subject, '/admin');
    PERFORM public.notify_user(NEW.raised_by, 'Report received', 'Our support team will review it shortly.', '/bookings');
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('resolved','rejected','closed') THEN
    PERFORM public.notify_user(NEW.raised_by, 'Dispute ' || NEW.status,
      COALESCE(NEW.resolution, 'Support has updated your report.'), '/bookings');
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_dispute_ins ON public.disputes;
CREATE TRIGGER trg_notify_dispute_ins AFTER INSERT ON public.disputes
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_dispute();
DROP TRIGGER IF EXISTS trg_notify_dispute_upd ON public.disputes;
CREATE TRIGGER trg_notify_dispute_upd AFTER UPDATE ON public.disputes
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_dispute();

-- Live notification stream
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
