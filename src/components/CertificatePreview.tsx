import ParticipationCertificate from "@/certificates/ParticipationCertificate";

export default function CertificatePreview() {
  return (
    <main className="certificate-preview-shell">
      <div className="certificate-preview-toolbar">
        <button type="button" onClick={() => window.print()}>
          Print / Save PDF
        </button>
      </div>

      <div className="certificate-preview-frame">
        <ParticipationCertificate
          participantName="N Pranith Kumar"
          institutionName="Kuppam Engineering College"
          certificateId="NXT26-P-000001"
          verificationUrl="https://nextron26.in/certificate/verify/NXT26-P-000001"
        />
      </div>
    </main>
  );
}
