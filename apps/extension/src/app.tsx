import { ReactLocation, Router } from "@tanstack/react-location"
import { useState } from "react"

import { getRoutes, reactLocationOptions } from "~features/router"

const App = () => {
  // Configure router
  const [location] = useState(() => new ReactLocation(reactLocationOptions))

  return <Router location={location} routes={getRoutes()} />
}

export default App
