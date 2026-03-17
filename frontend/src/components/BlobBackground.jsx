import { motion } from 'framer-motion';

export default function BlobBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <motion.div
        style={{
          position: 'absolute', borderRadius: '50%',
          width: 600, height: 600,
          left: '-100px', top: '100px',
          background: 'radial-gradient(circle, #4F46E5 0%, #7C3AED 50%, transparent 100%)',
          filter: 'blur(120px)', opacity: 0.25,
        }}
        animate={{ x: [0, 80, 0], y: [0, -60, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        style={{
          position: 'absolute', borderRadius: '50%',
          width: 500, height: 500,
          right: '-80px', top: '300px',
          background: 'radial-gradient(circle, #0369A1 0%, #0891B2 50%, transparent 100%)',
          filter: 'blur(120px)', opacity: 0.2,
        }}
        animate={{ x: [0, -60, 0], y: [0, 80, 0], scale: [1, 1.3, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        style={{
          position: 'absolute', borderRadius: '50%',
          width: 400, height: 400,
          left: '40%', bottom: '10%',
          background: 'radial-gradient(circle, #6D28D9 0%, #4338CA 50%, transparent 100%)',
          filter: 'blur(100px)', opacity: 0.2,
        }}
        animate={{ x: [0, 50, -50, 0], y: [0, -40, 40, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
