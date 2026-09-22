import { useMemo } from "react";
import type { ParticipationCertificateData } from "./certificate-types";
import "./participation-certificate.css";

function nameClass(name: string) {
  const length = name.trim().length;
  if (length > 38) return "certificate-fill-name certificate-fill-name--xs";
  if (length > 30) return "certificate-fill-name certificate-fill-name--sm";
  if (length > 22) return "certificate-fill-name certificate-fill-name--md";
  return "certificate-fill-name";
}

export default function ParticipationCertificate({
  participantName,
  institutionName,
}: ParticipationCertificateData) {
  const normalizedName = useMemo(
    () => participantName.trim() || "PARTICIPANT NAME",
    [participantName],
  );

  const normalizedInstitution = useMemo(
    () => institutionName.trim() || "Institution / College Name",
    [institutionName],
  );

  return (
    <section
      className="nextron-certificate"
      aria-label="NEXTRON 2026 participation certificate"
    >
      <img
        className="certificate-template-image"
        src="/certificates/participation-template.png"
        alt=""
        aria-hidden="true"
      />

      <div className="certificate-name-field">
        <span className={nameClass(normalizedName)}>{normalizedName}</span>
      </div>

      <div className="certificate-institution-field">
        <span className="certificate-fill-institution">
          {normalizedInstitution}
        </span>
      </div>
    </section>
  );
}
