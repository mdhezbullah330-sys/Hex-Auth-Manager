import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  rotation: number;
  rotSpeed: number;
  pulseOffset: number;
}

function drawHex(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rotation: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i + rotation;
    const px = x + r * Math.cos(angle);
    const py = y + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function useThreeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let animId: number;
    let mouseX = 0.5;
    let mouseY = 0.5;
    let particles: Particle[] = [];

    function resize() {
      width = canvas!.offsetWidth;
      height = canvas!.offsetHeight;
      canvas!.width = width;
      canvas!.height = height;
      initParticles();
    }

    function initParticles() {
      const count = Math.floor((width * height) / 14000);
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 22 + 8,
        opacity: Math.random() * 0.18 + 0.04,
        rotation: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.006,
        pulseOffset: Math.random() * Math.PI * 2,
      }));
    }

    function drawConnections() {
      const maxDist = 180;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.06;
            ctx!.beginPath();
            ctx!.strokeStyle = `rgba(124,58,237,${alpha})`;
            ctx!.lineWidth = 0.8;
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);
            ctx!.stroke();
          }
        }
      }
    }

    let t = 0;
    function animate() {
      animId = requestAnimationFrame(animate);
      t += 0.012;
      ctx!.clearRect(0, 0, width, height);

      // Subtle parallax offset from mouse
      const offsetX = (mouseX - 0.5) * 18;
      const offsetY = (mouseY - 0.5) * 12;

      drawConnections();

      particles.forEach((p) => {
        p.x += p.vx + offsetX * 0.0015;
        p.y += p.vy + offsetY * 0.0015;
        p.rotation += p.rotSpeed;

        if (p.x < -60) p.x = width + 60;
        if (p.x > width + 60) p.x = -60;
        if (p.y < -60) p.y = height + 60;
        if (p.y > height + 60) p.y = -60;

        const pulse = 1 + 0.06 * Math.sin(t + p.pulseOffset);
        const r = p.size * pulse;
        const alpha = p.opacity * (0.85 + 0.15 * Math.sin(t * 0.8 + p.pulseOffset));

        // Outer glow
        ctx!.shadowBlur = 12;
        ctx!.shadowColor = `rgba(124,58,237,0.3)`;

        // Wireframe hex
        drawHex(ctx!, p.x, p.y, r, p.rotation);
        ctx!.strokeStyle = `rgba(124,58,237,${alpha})`;
        ctx!.lineWidth = 0.8;
        ctx!.stroke();

        // Inner smaller solid hex
        drawHex(ctx!, p.x, p.y, r * 0.4, p.rotation + Math.PI / 6);
        ctx!.fillStyle = `rgba(124,58,237,${alpha * 0.3})`;
        ctx!.fill();

        ctx!.shadowBlur = 0;
      });
    }

    const onMouse = (e: MouseEvent) => {
      mouseX = e.clientX / window.innerWidth;
      mouseY = e.clientY / window.innerHeight;
    };
    window.addEventListener("mousemove", onMouse);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", onMouse);
      ro.disconnect();
    };
  }, []);

  return canvasRef;
}
