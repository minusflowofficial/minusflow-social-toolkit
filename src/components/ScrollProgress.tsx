import { motion, useScroll } from "framer-motion";

const ScrollProgress = () => {
  const { scrollYProgress } = useScroll();

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-50 h-0.5 origin-left bg-gradient-to-r from-primary via-primary/80 to-primary"
      style={{ scaleX: scrollYProgress }}
    />
  );
};

export default ScrollProgress;
