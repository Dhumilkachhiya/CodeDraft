import { motion } from "framer-motion";

const CARD_STYLE = {
  backgroundColor: "#11161d",
  border: "1px solid #27313d",
  borderRadius: "8px",
  padding: "24px",
  transition: "border-color 0.2s ease",
};

function Card({ children, hoverable = false, style: customStyle = {}, onClick, ...props }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      whileHover={
        hoverable
          ? { borderColor: "#34d399", transition: { duration: 0.2 } }
          : {}
      }
      style={{ ...CARD_STYLE, cursor: hoverable ? "pointer" : "default", ...customStyle }}
      onClick={onClick}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export default Card;
