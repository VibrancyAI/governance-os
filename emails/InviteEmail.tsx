import * as React from "react";
import { Html } from "@react-email/components";

export function InviteEmail({ orgName, inviterEmail, acceptUrl, role }: { orgName: string; inviterEmail: string; acceptUrl: string; role: string }) {
  return (
    <Html>
      <div style={{ fontFamily: "Inter, ui-sans-serif, system-ui", background: "#0b1b34", padding: "24px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", background: "#ffffff", borderRadius: 12, overflow: "hidden", boxShadow: "0 10px 30px rgba(2,6,23,.2)" }}>
          <div style={{ background: "linear-gradient(90deg,#2563eb,#1d4ed8)", padding: "16px 20px", color: "#fff", fontWeight: 700, fontSize: 16 }}>
            Governance OS
          </div>
          <div style={{ padding: 24, color: "#0f172a" }}>
            <h1 style={{ margin: "0 0 8px", fontSize: 18 }}>You're invited to {orgName}</h1>
            <p style={{ margin: "0 0 16px", color: "#334155" }}>
              {inviterEmail} invited you as <b>{role}</b> to collaborate on the data room.
            </p>
            <a
              href={acceptUrl}
              style={{
                display: "inline-block",
                padding: "10px 14px",
                background: "#2563eb",
                color: "#fff",
                borderRadius: 8,
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Accept invite
            </a>
            <p style={{ marginTop: 16, fontSize: 12, color: "#64748b" }}>
              If you don’t have an account yet, you’ll be asked to sign in or create one first.
            </p>
          </div>
        </div>
      </div>
    </Html>
  );
}


