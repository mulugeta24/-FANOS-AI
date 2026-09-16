import { useEffect } from 'react'

interface Particle {
  x: number; y: number
  vx: number; vy: number
  radius: number; alpha: number
  color: string
}

interface Node {
  x: number; y: number
  vx: number; vy: number
  label: string; color: string
}

export function useNetworkCanvas(canvasRef: React.RefObject<HTMLCanvasElement>) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let W = 0, H = 0

    const COLORS = ['#22D3EE', '#3B82F6', '#A78BFA', '#10B981']
    const nodes: Node[] = []
    const particles: Particle[] = []

    function resize() {
      W = canvas!.width  = canvas!.offsetWidth
      H = canvas!.height = canvas!.offsetHeight
    }

    function initNodes() {
      nodes.length = 0
      const labels = ['NETWORK', 'WEB', 'SYSTEM', 'AI ENGINE', 'RISK', 'BLOCK', 'FANOS AI', 'WAF', 'IDS', 'RESPONSE']
      for (let i = 0; i < 12; i++) {
        nodes.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          label: labels[i % labels.length],
          color: COLORS[i % COLORS.length],
        })
      }
    }

    function spawnParticle() {
      const src = nodes[Math.floor(Math.random() * nodes.length)]
      const dst = nodes[Math.floor(Math.random() * nodes.length)]
      if (src === dst) return
      const steps = 80
      for (let s = 0; s < steps; s++) {
        particles.push({
          x: src.x + (dst.x - src.x) * (s / steps),
          y: src.y + (dst.y - src.y) * (s / steps),
          vx: (dst.x - src.x) / steps,
          vy: (dst.y - src.y) / steps,
          radius: Math.random() * 1.5 + 0.5,
          alpha: 1 - s / steps,
          color: src.color,
        })
      }
    }

    function draw() {
      ctx!.clearRect(0, 0, W, H)

      // Move nodes
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy
        if (n.x < 0 || n.x > W) n.vx *= -1
        if (n.y < 0 || n.y > H) n.vy *= -1
      })

      // Draw edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 220) {
            ctx!.beginPath()
            ctx!.strokeStyle = `rgba(34,211,238,${0.12 * (1 - dist / 220)})`
            ctx!.lineWidth = 0.5
            ctx!.moveTo(nodes[i].x, nodes[i].y)
            ctx!.lineTo(nodes[j].x, nodes[j].y)
            ctx!.stroke()
          }
        }
      }

      // Draw nodes
      nodes.forEach(n => {
        ctx!.beginPath()
        ctx!.arc(n.x, n.y, 3, 0, Math.PI * 2)
        ctx!.fillStyle = n.color
        ctx!.globalAlpha = 0.7
        ctx!.fill()
        ctx!.globalAlpha = 1
      })

      // Move & draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx; p.y += p.vy
        p.alpha -= 0.012
        if (p.alpha <= 0) { particles.splice(i, 1); continue }
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx!.fillStyle = p.color
        ctx!.globalAlpha = p.alpha * 0.6
        ctx!.fill()
        ctx!.globalAlpha = 1
      }

      // Spawn new particles
      if (Math.random() < 0.08) spawnParticle()

      // FANOS AI text watermark
      ctx!.font = 'bold 11px "Segoe UI", sans-serif'
      ctx!.fillStyle = 'rgba(34,211,238,0.06)'
      ctx!.letterSpacing = '4px'
      const texts = ['FANOS AI', 'DETECT', 'ANALYZE', 'PROTECT', 'RESPOND', 'PREVENT']
      texts.forEach((t, idx) => {
        const x = (W / texts.length) * idx + W / (texts.length * 2)
        const y = H * 0.5 + Math.sin(Date.now() * 0.0005 + idx) * (H * 0.3)
        ctx!.fillText(t, x - 28, y)
      })

      animId = requestAnimationFrame(draw)
    }

    resize()
    initNodes()
    draw()

    const ro = new ResizeObserver(() => { resize(); initNodes() })
    ro.observe(canvas)

    return () => {
      cancelAnimationFrame(animId)
      ro.disconnect()
    }
  }, [canvasRef])
}
