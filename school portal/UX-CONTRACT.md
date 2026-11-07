# Attendance workflow contract

- A school admin reviews the saved demo campus center or captures the actual campus center using browser geolocation, reviews accuracy and coordinates, chooses a radius, and saves. Check-in remains disabled without a valid center.
- An admin registers each real staff member's device using the code displayed on that employee's `/staff-checkin` page. The two seeded demo devices are visibly labeled and can be moved across the boundary from the map.
- Teachers, librarians, and accountants use `/staff-checkin`. A fresh campus fix and camera selfie are required for each punch. Server responses determine success. Manual records for the day block self check-in until an admin resolves them.
- The admin map distinguishes live positions from check-in positions. A live position requires a registered device, an open staff page, location permission, and a recent accepted fix. The map labels inside positions present and outside positions absent. Real positions become stale after 90 seconds and disappear from the live layer. Check-in positions remain labeled as snapshots.
- The admin daily log uses real attendance records and shows private selfies only while retained. Empty, loading, permission, and request-failure states must be explicit.
- All attendance reads, writes, and live events are scoped by the authenticated school. Only school admins receive the presence event and map snapshot.
- Use visible focus, semantic buttons, labeled controls, and readable status without relying on marker color alone. The map roster carries the same information in text.
