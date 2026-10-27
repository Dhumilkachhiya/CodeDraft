import { motion } from "framer-motion";

const VARIANTS = {
  primary: {
    base: {
      backgroundColor: "#34d399",
      color: "#07110d",
      border: "1px solid #34d399",
    },
    hover: {
      backgroundColor: "#6ee7b7",
    },
  },
  secondary: {
    base: {
      backgroundColor: "transparent",
      color: "#f4f7fb",
      border: "1px solid #3a4858",
    },
    hover: {
      backgroundColor: "#171e27",
    },
  },
  danger: {
    base: {
      backgroundColor: "#fb7185",
      color: "#160609",
      border: "none",
    },
    hover: {
      backgroundColor: "#fda4af",
    },
  },
  ghost: {
    base: {
      backgroundColor: "transparent",
      color: "#a8b3c3",
      border: "none",
    },
    hover: {
      backgroundColor: "#171e27",
      color: "#f4f7fb",
    },
  },
};

const SIZES = {
  sm: { padding: "8px 16px", fontSize: "13px", height: "36px" },
  md: { padding: "10px 24px", fontSize: "14px", height: "44px" },
  lg: { padding: "14px 32px", fontSize: "16px", height: "52px" },
};

function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  fullWidth = false,
  onClick,
  type = "button",
  style: customStyle = {},
  ...props
}) {
  const variantStyle = VARIANTS[variant] || VARIANTS.primary;
  const sizeStyle = SIZES[size] || SIZES.md;

  const baseStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    borderRadius: "7px",
    fontWeight: 700,
    fontFamily: "Inter, system-ui, sans-serif",
    cursor: disabled || loading ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "all 0.2s ease",
    width: fullWidth ? "100%" : "auto",
    letterSpacing: "0",
    ...variantStyle.base,
    ...sizeStyle,
    ...customStyle,
  };

  return (
    <motion.button
      whileHover={!disabled && !loading ? { scale: 1.01, filter: "brightness(1.1)" } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      style={baseStyle}
      disabled={disabled || loading}
      onClick={onClick}
      type={type}
      {...props}
    >
      {loading ? (
        <span
          style={{
            width: "18px",
            height: "18px",
            border: "2px solid rgba(238,232,245,0.3)",
            borderTop: "2px solid #f4f7fb",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
      ) : (
        children
      )}
    </motion.button>
  );
}

export default Button;
