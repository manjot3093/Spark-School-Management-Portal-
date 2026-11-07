# Staff attendance examiner demo

1. Start the existing MongoDB connection and backend with `cd backend && npm start`.
2. In another terminal, run `cd "school portal" && npm run dev`.
3. If the demo database has been reset, run `cd backend && npm run demo:attendance` once. This configures the existing `SPARK01` school at the laptop coordinate supplied in the screenshot (`23.396895, 85.380353`), with a 250 m boundary and two clearly labeled demo devices. It does not create or reset an administrator password.
4. Sign in using the existing school administrator account and open **HR → Staff Attendance & Campus Map**. The **Campus map** tab shows Demo Asha inside as **Present** and Demo Ravi outside as **Absent**. Click **Move outside** or **Move inside** on either demo card to demonstrate the live Socket.IO update. The blue circle is the campus boundary.
   Employee names remain visible beside their map markers; clicking a marker shows its status, accuracy and update time.
   In **Daily log**, use **Today**, **Yesterday**, **2 days ago** and **3 days ago** to see sample attendance for the two labeled demo employees. The setup script only inserts missing demo records and does not alter real staff attendance.
5. Open **Devices** to register a real employee's device. The employee signs in on that device and opens `/staff-checkin` to see their device code; enter that code against the employee in the admin view. The real employee must allow browser location and camera to check in or out. Their position updates about every 30 seconds while that page remains open. Live status is based on the latest in/out position; the separate daily log records actual selfie check-ins.

The saved center is a **demo coordinate from the supplied screenshot**. Before using real attendance, an administrator should verify the actual campus center in **Campus & rules**, review GPS accuracy, and save the correct location. Browser geolocation and camera require HTTPS or localhost. Real positions become stale after 90 seconds and are not retained as a trail.
