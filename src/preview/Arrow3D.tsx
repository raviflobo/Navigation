import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface Props {
  /** Degrees to rotate arrow about Y (bearing - heading) */
  angleDeg: number
  className?: string
}

export function Arrow3D({ angleDeg, className = 'arrow-canvas' }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const arrowRef = useRef<THREE.Group | null>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const w = mount.clientWidth || 140
    const h = mount.clientHeight || 140
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1a222c)

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100)
    camera.position.set(0, 4.5, 6)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 0.7))
    const dir = new THREE.DirectionalLight(0xffffff, 0.9)
    dir.position.set(3, 5, 2)
    scene.add(dir)

    const group = new THREE.Group()
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 2.2, 16),
      new THREE.MeshStandardMaterial({ color: 0x2a9d8f }),
    )
    shaft.position.y = 0.2
    const head = new THREE.Mesh(
      new THREE.ConeGeometry(0.45, 1.1, 16),
      new THREE.MeshStandardMaterial({ color: 0xe9c46a }),
    )
    head.position.y = 1.7
    group.add(shaft, head)
    // Point "forward" along -Z initially; we rotate about Y by angle
    group.rotation.x = -Math.PI / 2
    scene.add(group)
    arrowRef.current = group

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.6, 1.75, 48),
      new THREE.MeshBasicMaterial({ color: 0x2e3d4f, side: THREE.DoubleSide }),
    )
    ring.rotation.x = -Math.PI / 2
    scene.add(ring)

    let frame = 0
    const animate = () => {
      frame = requestAnimationFrame(animate)
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(frame)
      renderer.dispose()
      mount.removeChild(renderer.domElement)
      arrowRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!arrowRef.current) return
    // Screen/compass: rotate so arrow yaw matches bearing-heading
    arrowRef.current.rotation.z = THREE.MathUtils.degToRad(-angleDeg)
  }, [angleDeg])

  return <div ref={mountRef} className={className} />
}
