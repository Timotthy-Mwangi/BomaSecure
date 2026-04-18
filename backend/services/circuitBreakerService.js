// Circuit Breaker Service for BomaSecure
// Implements graceful degradation and failure recovery patterns

class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    
    // Configuration
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 10000; // 10 seconds
    this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
    
    // Callbacks
    this.onOpen = options.onOpen || (() => {});
    this.onClose = options.onClose || (() => {});
    this.onHalfOpen = options.onHalfOpen || (() => {});
    
    // Statistics
    this.stats = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      rejectedCalls: 0,
      lastCallTime: null
    };
  }

  // Execute function with circuit breaker
  async execute(fn, fallback = null) {
    this.stats.totalCalls++;
    this.stats.lastCallTime = Date.now();

    // Check if circuit is open
    if (this.state === 'OPEN') {
      // Check if reset timeout has passed
      if (Date.now() >= this.nextAttemptTime) {
        this.state = 'HALF_OPEN';
        this.onHalfOpen();
        console.log(`Circuit ${this.name} transitioning to HALF_OPEN`);
      } else {
        // Circuit is open, reject the call
        this.stats.rejectedCalls++;
        
        if (fallback) {
          console.log(`Circuit ${this.name} is OPEN, using fallback`);
          return await fallback();
        }
        
        throw new Error(`Circuit ${this.name} is OPEN`);
      }
    }

    try {
      // Execute the function with timeout
      const result = await Promise.race([
        fn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), this.timeout)
        )
      ]);

      // Success
      this.onSuccess();
      return result;
    } catch (error) {
      // Failure
      this.onFailure(error);
      
      // Try fallback if available
      if (fallback) {
        console.log(`Circuit ${this.name} failed, using fallback`);
        return await fallback();
      }
      
      throw error;
    }
  }

  // Handle successful execution
  onSuccess() {
    this.stats.successfulCalls++;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      
      if (this.successCount >= this.successThreshold) {
        // Close the circuit
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        this.onClose();
        console.log(`Circuit ${this.name} CLOSED after successful recovery`);
      }
    } else {
      // Reset failure count on success
      this.failureCount = 0;
    }
  }

  // Handle failed execution
  onFailure(error) {
    this.stats.failedCalls++;
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.state === 'HALF_OPEN') {
      // Failed during half-open, go back to open
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.resetTimeout;
      this.successCount = 0;
      console.log(`Circuit ${this.name} back to OPEN after failed recovery`);
    } else if (this.failureCount >= this.failureThreshold) {
      // Threshold reached, open the circuit
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.resetTimeout;
      this.onOpen();
      console.log(`Circuit ${this.name} OPENED after ${this.failureCount} failures`);
    }
  }

  // Get circuit state
  getState() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      stats: { ...this.stats }
    };
  }

  // Reset circuit breaker
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    console.log(`Circuit ${this.name} manually reset`);
  }
}

class CircuitBreakerService {
  constructor() {
    this.circuits = new Map();
  }

  // Create or get circuit breaker
  getCircuit(name, options = {}) {
    if (!this.circuits.has(name)) {
      const circuit = new CircuitBreaker(name, {
        ...options,
        onOpen: () => this.onCircuitOpen(name),
        onClose: () => this.onCircuitClose(name),
        onHalfOpen: () => this.onCircuitHalfOpen(name)
      });
      this.circuits.set(name, circuit);
    }
    
    return this.circuits.get(name);
  }

  // Execute with circuit breaker
  async execute(circuitName, fn, fallback = null, options = {}) {
    const circuit = this.getCircuit(circuitName, options);
    return await circuit.execute(fn, fallback);
  }

  // Get all circuit states
  getAllStates() {
    const states = {};
    for (const [name, circuit] of this.circuits) {
      states[name] = circuit.getState();
    }
    return states;
  }

  // Reset all circuits
  resetAll() {
    for (const circuit of this.circuits.values()) {
      circuit.reset();
    }
    console.log('All circuits reset');
  }

  // Reset specific circuit
  resetCircuit(name) {
    const circuit = this.circuits.get(name);
    if (circuit) {
      circuit.reset();
      return true;
    }
    return false;
  }

  // Circuit event handlers
  onCircuitOpen(name) {
    console.warn(`⚠️ Circuit ${name} opened - service degraded`);
    // Could send alert here
  }

  onCircuitClose(name) {
    console.log(`✅ Circuit ${name} closed - service recovered`);
  }

  onCircuitHalfOpen(name) {
    console.log(`🔄 Circuit ${name} half-open - testing recovery`);
  }
}

// Graceful Degradation Service
class GracefulDegradationService {
  constructor() {
    this.circuitBreaker = new CircuitBreakerService();
    this.fallbackStrategies = new Map();
  }

  // Register fallback strategy
  registerFallback(serviceName, strategy) {
    this.fallbackStrategies.set(serviceName, strategy);
  }

  // Execute with graceful degradation
  async execute(serviceName, primaryFn, options = {}) {
    const circuit = this.circuitBreaker.getCircuit(serviceName, options);
    const fallback = this.fallbackStrategies.get(serviceName);
    
    try {
      return await circuit.execute(primaryFn, fallback);
    } catch (error) {
      console.error(`Service ${serviceName} failed:`, error.message);
      
      // Return degraded response
      return {
        degraded: true,
        service: serviceName,
        message: 'Service temporarily unavailable',
        timestamp: new Date()
      };
    }
  }

  // Get service health
  getServiceHealth() {
    const circuits = this.circuitBreaker.getAllStates();
    const health = {};
    
    for (const [name, state] of Object.entries(circuits)) {
      let status = 'healthy';
      let color = '#059669'; // High contrast Emerald-600
      let textColor = '#FFFFFF';

      if (state.state === 'HALF_OPEN') {
        status = 'degraded';
        color = '#D97706'; // Darker Amber-600 for better visibility
        textColor = '#000000'; // Black text for maximum contrast on amber
      } else if (state.state === 'OPEN') {
        status = 'unhealthy';
        color = '#DC2626'; // Red-600 (High contrast red)
        textColor = '#FFFFFF';
      }

      health[name] = {
        status,
        color,
        textColor,
        ...state
      };
    }
    
    return health;
  }
}

// Create singleton instances
const circuitBreakerService = new CircuitBreakerService();
const gracefulDegradationService = new GracefulDegradationService();

// Register common fallback strategies
gracefulDegradationService.registerFallback('database', async () => {
  console.log('Using database fallback - returning cached data');
  return { source: 'cache', degraded: true };
});

gracefulDegradationService.registerFallback('maintenance-service', async () => {
  console.log('Using Maintenance fallback - service currently in read-only mode');
  return { source: 'static-cache', degraded: true, message: 'Maintenance updates are currently delayed.' };
});

gracefulDegradationService.registerFallback('redis', async () => {
  console.log('Using Redis fallback - proceeding without cache');
  return { source: 'direct', degraded: true };
});

gracefulDegradationService.registerFallback('external-api', async () => {
  console.log('Using external API fallback - returning default response');
  return { source: 'default', degraded: true };
});

module.exports = {
  CircuitBreaker,
  CircuitBreakerService,
  GracefulDegradationService,
  circuitBreakerService,
  gracefulDegradationService
};
