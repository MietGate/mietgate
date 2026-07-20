export const LOGO_URL = "https://customer-assets-jai6qajn.emergentagent.net/job_property-manager-373/artifacts/o3ek6ie3_mietgate_logo_symbol%20%281%29.png";

export function Logo({ className = "h-8", showText = true, textClass = "text-brand-dark", dataTestId }) {
  return (
    <div className="flex items-center gap-2" data-testid={dataTestId}>
      <img src={LOGO_URL} alt="MietGate" className={className} />
      {showText && (
        <span className={`font-display font-extrabold text-xl tracking-tight ${textClass}`}>
          MietGate
        </span>
      )}
    </div>
  );
}
