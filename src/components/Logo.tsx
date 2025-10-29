// Logo oficial NexERP

interface LogoProps {
  className?: string;
  alt?: string;
  variant?: "light" | "dark";
}

const Logo = ({ className = "h-8", alt = "NexERP", variant = "light" }: LogoProps) => {
  const logoSrc = variant === "dark" 
    ? new URL('/src/assets/nexerp-logo-light.png', import.meta.url).href
    : "/nexerp-logo-official.png";
  
  return (
    <img 
      src={logoSrc}
      alt={alt} 
      className={className}
    />
  );
};

export default Logo;