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
    title: "Orchestrated Elements",
    category: "Timeline",
    description: "Multiple elements dancing together in perfect harmony",
    code: `import { timeline } from 'mayonation';

// Orchestrated multi-element animation
timeline()
  .add('.demo-element', {
    to: { scale: 0.8, rotateZ: -45 },
    duration: 600
  })
  .add('.stagger-item', {
    to: { translateY: -30, rotateZ: 180 },
    duration: 800,
    stagger: 100
  }, '-=400')
  .add('.demo-element', {
    to: { translateX: 60, backgroundColor: '#10B981' },
    duration: 700
  }, '-=200')
  .add('.stagger-item', {
    to: { scale: 1.2, rotateZ: 360 },
    duration: 500,
    stagger: 80
  })
  .play();`,
    demo: "orchestratedElements",
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
    title: "Sequential Reveals",
    category: "Timeline",
    description: "Elements appearing with different reveal animations",
    code: `import { timeline, Position } from 'mayonation';

// Sequential reveal with labels
timeline()
  .add('.demo-element', {
    label: 'mainStart',
    from: { opacity: 0, scale: 0 },
    to: { opacity: 1, scale: 1.2 },
    duration: 800,
    ease: 'easeOutBack'
  })
  .add('.stagger-item', {
    from: { translateY: 50, opacity: 0 },
    to: { translateY: 0, opacity: 1 },
    duration: 600,
    stagger: 120,
    ease: 'easeOutCubic'
  }, Position.with('mainStart', 200))
  .add('.demo-element', {
    to: { rotateZ: 360, borderRadius: '50%' },
    duration: 1000,
    ease: 'easeInOutQuad'
  }, '-=800')
  .play();`,
    demo: "sequentialReveals",
    gradient: "from-orange-500 to-amber-600",
  },
  {
    title: "Complex Choreography",
    category: "Timeline",
    description: "Multi-stage timeline with overlapping animations",
    code: `import { timeline } from 'mayonation';

// Complex choreographed sequence
timeline()
  // Stage 1: Setup
  .add('.demo-element', {
    to: { scale: 0.7, opacity: 0.8 },
    duration: 400
  })
  // Stage 2: Parallel actions
  .group([
    {
      target: '.demo-element',
      options: {
        to: { translateX: -40, rotateZ: -90 },
        duration: 800,
        ease: 'easeInOutBack'
      }
    },
    {
      target: '.stagger-item',
      options: {
        to: { scale: 0.8, translateY: -20 },
        duration: 600,
        stagger: 100
      }
    }
  ])
  // Stage 3: Grand finale
  .add('.demo-element', {
    to: { 
      translateX: 40, 
      translateY: -30,
      scale: 1.3, 
      rotateZ: 180,
      backgroundColor: '#8B5CF6' 
    },
    duration: 1200,
    ease: 'easeOutElastic'
  }, '+=200')
  .add('.stagger-item', {
    to: { translateY: 0, scale: 1.1, rotateZ: 360 },
    duration: 800,
    stagger: 80,
    ease: 'easeOutBounce'
  }, '-=600')
  .play();`,
    demo: "complexChoreography",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    title: "Morphing Sequence",
    category: "Timeline",
    description: "Smooth transitions through multiple states and colors",
    code: `import { timeline } from 'mayonation';

// Multi-stage morphing animation
timeline()
  .add('.demo-element', {
    to: { 
      backgroundColor: '#FF6B9D',
      borderRadius: '25%',
      scale: 1.1
    },
    duration: 800,
    ease: 'easeInOut'
  })
  .add('.demo-element', {
    to: {
      rotateZ: 45,
      translateX: 30,
      backgroundColor: '#06D6A0'
    },
    duration: 700
  }, '+=100')
  .add('.demo-element', {
    to: {
      borderRadius: '50%',
      scale: 1.3,
      rotateZ: 180,
      backgroundColor: '#F59E0B'
    },
    duration: 900,
    ease: 'easeOutBack'
  }, '+=150')
  .add('.demo-element', {
    to: {
      translateX: 0,
      rotateZ: 360,
      scale: 1,
      borderRadius: '12px',
      backgroundColor: '#3B82F6'
    },
    duration: 1000,
    ease: 'easeInOutCubic'
  }, '+=200')
  .play();`,
    demo: "morphingSequence",
    gradient: "from-cyan-500 to-blue-600",
  },
  {
    title: "Chain Sequence",
    category: "Timeline",
    description: "Enhanced chained animations with precise timing control",
    code: `import { timeline, Position } from 'mayonation';

// Enhanced chain sequence
timeline()
  .add('.demo-element', {
    label: 'firstMove',
    to: { scale: 1.3, rotateZ: 90 },
    duration: 500,
    ease: 'easeOutBack'
  })
  .add('.demo-element', {
    to: { translateX: 80, backgroundColor: '#10B981' },
    duration: 800,
    ease: 'easeInOutQuad'
  }, Position.after(100))
  .add('.demo-element', {
    to: { rotateZ: 270, borderRadius: '50%' },
    duration: 600,
    ease: 'easeOutBounce'
  })
  .add('.demo-element', {
    to: { 
      translateY: -40,
      scale: 0.9,
      backgroundColor: '#8B5CF6'
    },
    duration: 700
  }, Position.with('firstMove', 1200))
  .add('.demo-element', {
    to: {
      translateX: 0,
      translateY: 0,
      scale: 1,
      rotateZ: 360,
      borderRadius: '12px'
    },
    duration: 800,
    ease: 'easeInOutBack'
  })
  .play();`,
    demo: "enhancedChainSequence",
    gradient: "from-indigo-500 to-blue-600",
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
    opacity: 0.7,
    borderRadius: '50%'
  },
  repeat: 'infinite',
  yoyo: true,
  ease: 'easeInOutQuad'
}).play();`,
    demo: "pulseEffect",
    gradient: "from-rose-500 to-pink-600",
  },
  {
    title: "Timeline Sync Demo",
    category: "Timeline",
    description: "Synchronized timeline with percentage-based positioning",
    code: `import { timeline, Position } from 'mayonation';

// Synchronized timeline demonstration
timeline()
  .add('.demo-element', {
    label: 'sync-start',
    to: { translateX: -60, scale: 0.8 },
    duration: 1000
  })
  .add('.stagger-item:nth-child(1)', {
    to: { translateY: -50, rotateZ: 180 },
    duration: 800
  }, Position.percent(10))
  .add('.stagger-item:nth-child(3)', {
    to: { translateY: -30, rotateZ: -90 },
    duration: 600
  }, Position.percent(25))
  .add('.stagger-item:nth-child(5)', {
    to: { translateY: -40, rotateZ: 90 },
    duration: 700
  }, Position.percent(40))
  .add('.demo-element', {
    to: { 
      translateX: 60,
      scale: 1.2,
      backgroundColor: '#EF4444',
      rotateZ: 180
    },
    duration: 900
  }, Position.percent(60))
  .add(['.stagger-item'], {
    to: { 
      translateY: 0, 
      rotateZ: 360,
      scale: 1.1 
    },
    duration: 800,
    stagger: 100
  }, Position.percent(80))
  .play();`,
    demo: "timelineSync",
    gradient: "from-red-500 to-orange-600",
  },
  {
    title: "Spring Physics Chain",
    category: "Timeline",
    description: "Physics-based spring animations in sequence",
    code: `import { timeline } from 'mayonation';

// Spring physics chain reaction
const springEasing = (t) => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 :
    Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

timeline()
  .add('.demo-element', {
    to: { 
      scale: 1.4,
      rotateZ: 45 
    },
    duration: 1200,
    ease: springEasing
  })
  .add('.demo-element', {
    to: {
      translateX: 80,
      rotateZ: 180
    },
    duration: 1500,
    ease: springEasing
  }, '-=600')
  .add('.demo-element', {
    to: {
      translateY: -60,
      scale: 0.9,
      backgroundColor: '#059669'
    },
    duration: 1800,
    ease: springEasing
  }, '-=900')
  .add('.demo-element', {
    to: {
      translateX: 0,
      translateY: 0,
      scale: 1,
      rotateZ: 360,
      borderRadius: '50%'
    },
    duration: 2000,
    ease: springEasing
  })
  .play();`,
    demo: "springPhysicsChain",
    gradient: "from-teal-500 to-green-600",
  },
];
