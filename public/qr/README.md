# QR Code Images

Drop the real UPI QR images here. Each file must be named exactly as shown
below and placed directly in this folder (public/qr/).

Once you place an image, open src/lib/eventPaymentData.ts and change
the corresponding `qrImage: null` to `qrImage: "/qr/<filename>"`.

## Expected filenames (suggested naming):

| Event                         | Suggested filename        |
|-------------------------------|---------------------------|
| Project Expo                  | project.png               |
| Paper Presentation            | paper.png                 |
| Code Debugging                | codedebug.png             |
| Ideathon                      | ideathon.png              |
| Web Design                    | webdesign.png             |
| AI Video Animation & Generation | aivideo.png             |
| Tech Quiz                     | techquiz.png              |
| Electro Charades              | electrocharades.png       |
| Logo Design                   | logodesign.png            |
| Photography                   | photography.png           |
| Treasure Hunt                 | treasure.png              |
| Meme Making                   | meme.png                  |
| Cine Quiz                     | cinequiz.png              |
| Free Fire                     | freefire.png              |
| BGMI                          | bgmi.png                  |
| Act & Guess                   | actguess.png              |

## Example

After placing `project.png` here, update eventPaymentData.ts:

  "Project Expo": {
    upiId: "aswinappu2005@ybl",
    qrImage: "/qr/project.png",   // <-- change null to this
  },

## Notes
- Reels Making has NO UPI ID configured yet. Do not add a QR for it
  until a UPI ID is provided.
- Do NOT use QR images from other events for a different event.
- Supported formats: PNG, JPG, WebP.
