export const examples = [
  {
    title: "Basic Transform",
    category: "Transform",
    description: "Simple scale and rotation animation with smooth easing",
    code: `import { mayo } from 'mayonation';

// Basic transform animation
mayo({
  target: '.demo-element',
  duration: 1500,
  to: {
    scale: 1.3,
    rotateZ: 180,
    translateX: 50
  },
  ease: 'easeInOutCubic'
}).play();`,
    demo: "basicTransform",
    gradient: "from-blue-500 to-purple-600",
  },
  {
    title: "Color Morphing",
    category: "Styles",
    description: "Smooth color transitions with border radius changes",
    code: `import { mayo } from 'mayonation';

// Color and shape morphing
mayo({
  target: '.demo-element',
  duration: 2000,
  to: {
    backgroundColor: '#FF6B9D',
    borderRadius: '50%',
    scale: 1.2
  },
  ease: 'easeInOutBack'
}).play();`,
    demo: "colorMorphing",
    gradient: "from-pink-500 to-rose-600",
  },
  {
    title: "Stagger Wave",
    category: "Timing",
    description: "Multiple elements animating in sequence with wave effect",
    code: `import { mayo } from 'mayonation';

// Stagger wave animation
mayo({
  target: '.wave-item',
  duration: 1000,
  stagger: 150,
  to: {
    translateY: -40,
    scale: 1.1,
    rotateZ: 15
  },
  ease: 'easeOutBounce'
}).play();`,
    demo: "staggerWave",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    title: "Keyframe Path",
    category: "Keyframes",
    description: "Complex path animation using multiple keyframes",
    code: `import { mayo } from 'mayonation';

// Keyframe path animation
mayo({
  target: '.demo-element',
  duration: 3000,
  keyframes: [
    { offset: 0, translateX: 0, translateY: 0, scale: 1 },
    { offset: 0.25, translateX: 100, translateY: -50, scale: 0.8 },
    { offset: 0.5, translateX: 50, translateY: -100, scale: 1.2 },
    { offset: 0.75, translateX: -50, translateY: -50, scale: 0.9 },
    { offset: 1, translateX: 0, translateY: 0, scale: 1 }
  ],
  ease: 'easeInOutSine'
}).play();`,
    demo: "keyframePath",
    gradient: "from-orange-500 to-amber-600",
  },
  {
    title: "Elastic Bounce",
    category: "Easing",
    description: "Elastic easing with overshoot and settle effect",
    code: `import { mayo } from 'mayonation';

// Elastic bounce animation
mayo({
  target: '.demo-element',
  duration: 2000,
  to: {
    translateX: 120,
    scale: 1.4,
    rotateZ: 360
  },
  ease: 'easeOutElastic'
}).play();`,
    demo: "elasticBounce",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    title: "Chain Sequence",
    category: "Timeline",
    description: "Chained animations using timeline for complex sequences",
    code: `import { timeline, mayo } from 'mayonation';

// Chain sequence animation
timeline()
  .add(mayo({
    target: '.demo-element',
    to: { scale: 1.3, rotateZ: 90 },
    duration: 500
  }))
  .add(mayo({
    target: '.demo-element', 
    to: { translateX: 80, backgroundColor: '#10B981' },
    duration: 800
  }), '+=100')
  .add(mayo({
    target: '.demo-element',
    to: { rotateZ: 270, borderRadius: '50%' },
    duration: 600
  }))
  .play();`,
    demo: "chainSequence",
    gradient: "from-cyan-500 to-blue-600",
  },
  {
    title: "Pulse Effect",
    category: "Loop",
    description: "Continuous pulsing animation with opacity changes",
    code: `import { mayo } from 'mayonation';

// Pulse effect with repeat
mayo({
  target: '.demo-element',
  duration: 1000,
  to: {
    scale: 1.3,
    opacity: 0.7
  },
  repeat: 'infinite',
  yoyo: true,
  ease: 'easeInOutQuad'
}).play();`,
    demo: "pulseEffect",
    gradient: "from-indigo-500 to-blue-600",
  },
  {
    title: "Spring Physics",
    category: "Advanced",
    description: "Physics-based spring animation with natural motion",
    code: `import { mayo } from 'mayonation';

// Spring physics simulation
mayo({
  target: '.demo-element',
  duration: 2500,
  to: {
    translateX: 100,
    translateY: -60,
    rotateZ: 180,
    scale: 1.2
  },
  ease: function(t) {
    // Custom spring easing
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 :
      Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }
}).play();`,
    demo: "springPhysics",
    gradient: "from-red-500 to-pink-600",
  },
];
