import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { toEnuMeters } from './geo'
import type { Waypoint } from './types'

interface Props {
  waypoints: Waypoint[]
  origin?: { lat: number; lon: number } | null
  className?: string
}

export function WaypointScene3D({ waypoints, origin, className = 'scene-wrap' }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const w = mount.clientWidth || 320
    const h = mount.clientHeight || 260
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0e12)

    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 2000)
    camera.position.set(20, 30, 40)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    const light = new THREE.DirectionalLight(0xffffff, 1.1)
    light.position.set(10, 20, 10)
    scene.add(light)
    scene.add(new THREE.AmbientLight(0x668899, 0.6))
    scene.add(new THREE.GridHelper(80, 20, 0x2a9d8f, 0x1a2a35))

    const group = new THREE.Group()
    scene.add(group)

    const ori =
      origin ??
      (waypoints[0] ? { lat: waypoints[0].lat, lon: waypoints[0].lon } : null)

    if (ori && waypoints.length) {
      const pts: THREE.Vector3[] = []
      for (const wp of waypoints) {
        const { x, z } = toEnuMeters(ori.lat, ori.lon, wp.lat, wp.lon)
        const v = new THREE.Vector3(x, 0.5, z)
        pts.push(v)
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.6, 16, 16),
          new THREE.MeshStandardMaterial({ color: 0x2a9d8f }),
        )
        mesh.position.copy(v)
        group.add(mesh)
      }
      if (pts.length >= 2) {
        const geo = new THREE.BufferGeometry().setFromPoints(pts)
        const line = new THREE.Line(
          geo,
          new THREE.LineBasicMaterial({ color: 0xe9c46a }),
        )
        group.add(line)
      }
      const box = new THREE.Box3().setFromObject(group)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.z, 10)
      camera.position.set(center.x + maxDim * 0.8, maxDim * 0.9, center.z + maxDim * 0.8)
      camera.lookAt(center)
    }

    let frame = 0
    let dragging = false
    let lastX = 0
    const onDown = (e: PointerEvent) => {
      dragging = true
      lastX = e.clientX
      mount.setPointerCapture(e.pointerId)
    }
    const onMove = (e: PointerEvent) => {
      if (!dragging) return
      const dx = e.clientX - lastX
      lastX = e.clientX
      group.rotation.y += dx * 0.01
    }
    const onUp = () => {
      dragging = false
    }
    mount.addEventListener('pointerdown', onDown)
    mount.addEventListener('pointermove', onMove)
    mount.addEventListener('pointerup', onUp)

    const animate = () => {
      frame = requestAnimationFrame(animate)
      if (!dragging) group.rotation.y += 0.003
      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      const nw = mount.clientWidth
      const nh = mount.clientHeight
      camera.aspect = nw / nh
      camera.updateProjectionMatrix()
      renderer.setSize(nw, nh)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
      mount.removeEventListener('pointerdown', onDown)
      mount.removeEventListener('pointermove', onMove)
      mount.removeEventListener('pointerup', onUp)
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [waypoints, origin])

  return <div ref={mountRef} className={className} />
}
