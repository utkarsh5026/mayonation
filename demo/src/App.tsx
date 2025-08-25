import { useRef, useEffect } from 'react'
import { animate } from 'mate'
import './App.css'

function App() {
  const boxRef = useRef<HTMLDivElement>(null)
  const circleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (boxRef.current) {
      animate(boxRef.current, {
        translateX: '200px',
        rotate: '360deg'
      }, {
        duration: 2000,
        easing: 'easeInOutCubic'
      })
    }
  }, [])

  const handleCircleClick = () => {
    if (circleRef.current) {
      animate(circleRef.current, {
        scale: 1.5,
        backgroundColor: '#ff6b6b'
      }, {
        duration: 500,
        easing: 'easeOutBounce'
      }).then(() => {
        animate(circleRef.current!, {
          scale: 1,
          backgroundColor: '#4ecdc4'
        }, {
          duration: 300
        })
      })
    }
  }

  return (
    <>
      <h1>Mate Animation Library Demo</h1>
      
      <div className="demo-section">
        <h2>Auto Animation on Load</h2>
        <div ref={boxRef} className="demo-box">
          Animated Box
        </div>
      </div>

      <div className="demo-section">
        <h2>Click to Animate</h2>
        <div 
          ref={circleRef} 
          className="demo-circle"
          onClick={handleCircleClick}
        >
          Click me!
        </div>
      </div>
    </>
  )
}

export default App
