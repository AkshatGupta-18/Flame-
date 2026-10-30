import { useState } from 'react'
import {
  Flame,
  Radio,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Wifi,
  Plug,
  Unplug,
} from 'lucide-react'
import './App.css'

function App() {
  const [port, setPort] = useState(null)
  const [connected, setConnected] = useState(false)
  const [flameDetected, setFlameDetected] = useState(false)
  const [smokeValue, setSmokeValue] = useState(null)
  const [lastMessage, setLastMessage] = useState('Waiting for Arduino data...')
  const [error, setError] = useState('')
  const [lastUpdate, setLastUpdate] = useState(null)

  async function connectArduino() {
    if (!('serial' in navigator)) {
      setError('Web Serial is not supported. Please use Chrome or Edge on your computer.')
      return
    }

    try {
      setError('')

      const selectedPort = await navigator.serial.requestPort()
      await selectedPort.open({ baudRate: 9600 })

      setPort(selectedPort)
      setConnected(true)
      setLastMessage('Connected. Waiting for sensor readings...')

      const decoder = new TextDecoderStream()
      const readableClosed = selectedPort.readable.pipeTo(decoder.writable)
      const reader = decoder.readable.getReader()

      let buffer = ''

      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break

          buffer += value
          const lines = buffer.split(/\r?\n/)
          buffer = lines.pop() ?? ''

          for (const rawLine of lines) {
            const line = rawLine.trim()
            if (!line) continue

            setLastMessage(line)
            setLastUpdate(new Date().toLocaleTimeString())

            const smokeMatch = line.match(/Smoke\s*Value\s*:\s*(\d+)/i)
            const flameMatch = line.match(/Flame\s*:\s*(DETECTED|NOT\s*DETECTED|NO\s*FLAME|CLEAR)/i)

            if (smokeMatch) {
              setSmokeValue(Number(smokeMatch[1]))
            }

            if (flameMatch) {
              const status = flameMatch[1].toUpperCase()
              setFlameDetected(status === 'DETECTED')
            }
          }
        }
      } catch (readError) {
        if (readError.name !== 'NetworkError') {
          throw readError
        }
      } finally {
        reader.releaseLock()
        await readableClosed.catch(() => {})
        await selectedPort.close().catch(() => {})
        setConnected(false)
        setPort(null)
      }
    } catch (err) {
      setConnected(false)
      setPort(null)
      setError(err.message || 'Could not connect to Arduino.')
    }
  }

  async function disconnectArduino() {
    if (!port) return

    try {
      await port.close()
    } catch {
      // The serial reader may already have closed the port.
    }

    setConnected(false)
    setPort(null)
    setLastMessage('Arduino disconnected.')
  }

  return (
    <main className="dashboard">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon"><Flame size={25} /></div>
          <div>
            <h1>PyroSense</h1>
            <p>SMART FIRE MONITORING SYSTEM</p>
          </div>
        </div>

        <div className={`connection ${connected ? 'online' : ''}`}>
          <span className="status-dot" />
          {connected ? 'Arduino Connected' : 'Arduino Disconnected'}
        </div>
      </header>

      <section className="welcome">
        <div>
          <p className="eyebrow">IOT MONITORING DASHBOARD</p>
          <h2>Fire Detection <span>System</span></h2>
          <p className="subtitle">Monitor flame activity and sensor readings in real time.</p>
        </div>

        <button
          className="connect-button"
          onClick={connected ? disconnectArduino : connectArduino}
        >
          {connected ? <Unplug size={18} /> : <Plug size={18} />}
          {connected ? 'Disconnect Arduino' : 'Connect Arduino'}
        </button>
      </section>

      {error && <div className="error-message" role="alert">{error}</div>}

      <section className={`status-banner ${flameDetected ? 'fire-banner' : ''}`}>
        <div className={`banner-icon ${flameDetected ? 'danger' : ''}`}>
          {flameDetected ? <ShieldAlert size={28} /> : <ShieldCheck size={28} />}
        </div>
        <div>
          <p className="banner-label">CURRENT ENVIRONMENT STATUS</p>
          <h3>{flameDetected ? 'Flame Detected!' : 'No Flame Detected'}</h3>
          <p>
            {!connected
              ? 'Connect the Arduino to receive live sensor data.'
              : flameDetected
                ? 'Potential fire detected. Check the surroundings immediately.'
                : 'The latest Arduino reading reports no flame.'}
          </p>
        </div>
        <span className={`status-pill ${flameDetected ? 'danger-pill' : ''}`}>
          {flameDetected ? 'ALERT' : connected ? 'NORMAL' : 'OFFLINE'}
        </span>
      </section>

      <section className="metrics">
        <article className="metric-card">
          <div className="metric-heading">
            <span>Flame Sensor</span>
            <div className="metric-icon flame-icon"><Flame size={21} /></div>
          </div>
          <h3 className={flameDetected ? 'fire-text' : ''}>
            {connected ? (flameDetected ? 'DETECTED' : 'CLEAR') : '—'}
          </h3>
          <p className="metric-foot">Live digital sensor status</p>
        </article>

        {/* <article className="metric-card">
          <div className="metric-heading">
            <span>Smoke Sensor</span>
            <div className="metric-icon smoke-icon"><Activity size={21} /></div>
          </div>
          <h3>{smokeValue ?? '—'}</h3>
          <p className="metric-foot">Raw analog sensor reading</p>
        </article> */}

        <article className="metric-card">
          <div className="metric-heading">
            <span>Device Connection</span>
            <div className="metric-icon connection-icon"><Radio size={21} /></div>
          </div>
          <h3>{connected ? 'CONNECTED' : 'OFFLINE'}</h3>
          <p className="metric-foot">Serial communication at 9600 baud</p>
        </article>
      </section>

      <section className="lower-grid">
        <article className="panel">
          <div className="panel-title">
            <Activity size={20} />
            <h3>Live Sensor Monitoring</h3>
          </div>
          <div className="monitor-placeholder">
            <Radio size={34} />
            <h4>{connected ? 'Receiving Arduino data' : 'No live data yet'}</h4>
            <p>{lastMessage}</p>
            {lastUpdate && <p>Last update: {lastUpdate}</p>}
          </div>
        </article>

        <article className="panel device-panel">
          <div className="panel-title">
            <Wifi size={20} />
            <h3>System Information</h3>
          </div>
          <div className="info-row"><span>Controller</span><strong>Arduino Uno</strong></div>
          <div className="info-row"><span>Communication</span><strong>USB Serial</strong></div>
          <div className="info-row"><span>Baud Rate</span><strong>9600 baud</strong></div>
          <div className="info-row"><span>Monitoring</span><strong>Flame & Smoke</strong></div>
          <div className="info-row"><span>Interface</span><strong>React Web App</strong></div>
        </article>
      </section>

      <footer>PyroSense · IoT Flame Detection Project · Built with React</footer>
    </main>
  )
}

export default App
