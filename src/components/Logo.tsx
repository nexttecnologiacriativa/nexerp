// Logo oficial NexERP

interface LogoProps {
  className?: string;
  alt?: string;
}

const Logo = ({ className = "h-8", alt = "NexERP" }: LogoProps) => {
  return (
    <img 
      src="/nexerp-logo-official.png" 
      alt={alt} 
      className={className}
    />
  );
};

export default Logo;