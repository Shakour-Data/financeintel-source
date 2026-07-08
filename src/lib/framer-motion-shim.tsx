import * as React from "react";

type MotionProps = Record<string, any>;

function createMotionComponent(tag: string) {
  const MotionComponent = React.forwardRef<HTMLElement, MotionProps>(
    function MotionComponent(props, ref) {
      const {
        initial,
        animate,
        exit,
        transition,
        variants,
        whileHover,
        whileTap,
        whileInView,
        whileFocus,
        whileDrag,
        layout,
        layoutId,
        drag,
        dragConstraints,
        dragElastic,
        onAnimationComplete,
        ...rest
      } = props;

      return React.createElement(tag, { ...rest, ref });
    }
  );
  return MotionComponent;
}

const motion = new Proxy({} as Record<string, React.ComponentType<any>>, {
  get(_target, prop: string) {
    return createMotionComponent(prop);
  },
});

function AnimatePresence({
  children,
}: {
  children?: React.ReactNode;
  mode?: "sync" | "wait" | "popLayout";
  initial?: boolean;
}) {
  return React.createElement(React.Fragment, null, children);
}

export { motion, AnimatePresence };
export default motion;
