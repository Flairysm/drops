// ============================================================================
// PERFORMANCE BENCHMARKS
// ============================================================================
// Custom performance testing utilities for Drops application

const axios = require('axios');
const { performance } = require('perf_hooks');

// ============================================================================
// CONFIGURATION
// ============================================================================

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS || '10', 10);
const TEST_DURATION = parseInt(process.env.TEST_DURATION || '60', 10); // seconds

// ============================================================================
// PERFORMANCE METRICS
// ============================================================================

class PerformanceMetrics {
  constructor() {
    this.results = [];
    this.errors = [];
    this.startTime = Date.now();
  }

  recordRequest(endpoint, method, responseTime, statusCode, error = null) {
    const result = {
      timestamp: Date.now(),
      endpoint,
      method,
      responseTime,
      statusCode,
      error: error?.message || null
    };

    this.results.push(result);
    
    if (error || statusCode >= 400) {
      this.errors.push(result);
    }
  }

  getSummary() {
    const totalRequests = this.results.length;
    const totalErrors = this.errors.length;
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
    
    const responseTimes = this.results.map(r => r.responseTime);
    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const p95ResponseTime = this.percentile(responseTimes, 95);
    const p99ResponseTime = this.percentile(responseTimes, 99);
    
    const duration = Date.now() - this.startTime;
    const requestsPerSecond = totalRequests / (duration / 1000);

    return {
      totalRequests,
      totalErrors,
      errorRate: errorRate.toFixed(2),
      avgResponseTime: avgResponseTime.toFixed(2),
      p95ResponseTime: p95ResponseTime.toFixed(2),
      p99ResponseTime: p99ResponseTime.toFixed(2),
      requestsPerSecond: requestsPerSecond.toFixed(2),
      duration: duration / 1000
    };
  }

  percentile(arr, p) {
    const sorted = arr.sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  getEndpointBreakdown() {
    const breakdown = {};
    
    this.results.forEach(result => {
      const key = `${result.method} ${result.endpoint}`;
      if (!breakdown[key]) {
        breakdown[key] = {
          count: 0,
          totalTime: 0,
          errors: 0
        };
      }
      
      breakdown[key].count++;
      breakdown[key].totalTime += result.responseTime;
      if (result.error || result.statusCode >= 400) {
        breakdown[key].errors++;
      }
    });

    // Calculate averages
    Object.keys(breakdown).forEach(key => {
      const data = breakdown[key];
      data.avgTime = data.totalTime / data.count;
      data.errorRate = (data.errors / data.count) * 100;
    });

    return breakdown;
  }
}

// ============================================================================
// TEST SCENARIOS
// ============================================================================

class TestScenarios {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.authToken = null;
    this.userId = null;
  }

  async makeRequest(method, endpoint, data = null, headers = {}) {
    const start = performance.now();
    
    try {
      const config = {
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        timeout: 10000
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      const responseTime = performance.now() - start;
      
      return {
        success: true,
        responseTime,
        statusCode: response.status,
        data: response.data
      };
    } catch (error) {
      const responseTime = performance.now() - start;
      
      return {
        success: false,
        responseTime,
        statusCode: error.response?.status || 0,
        error
      };
    }
  }

  async healthCheck() {
    return await this.makeRequest('GET', '/api/health');
  }

  async registerUser() {
    const username = `perftest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const email = `${username}@example.com`;
    
    const result = await this.makeRequest('POST', '/api/register', {
      username,
      email,
      password: 'testpassword123'
    });

    if (result.success && result.data.user) {
      this.userId = result.data.user.id;
    }

    return result;
  }

  async loginUser() {
    const result = await this.makeRequest('POST', '/api/login', {
      email: 'perftest@example.com',
      password: 'testpassword123'
    });

    if (result.success && result.data.token) {
      this.authToken = result.data.token;
    }

    return result;
  }

  async getMysteryPacks() {
    return await this.makeRequest('GET', '/api/packs/mystery');
  }

  async getClassicPacks() {
    return await this.makeRequest('GET', '/api/packs/classic');
  }

  async getSpecialPacks() {
    return await this.makeRequest('GET', '/api/packs/special');
  }

  async getVault() {
    const headers = this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {};
    return await this.makeRequest('GET', '/api/vault?page=1&limit=16', null, headers);
  }

  async getGlobalFeed() {
    return await this.makeRequest('GET', '/api/feed?limit=20&minTier=A');
  }

  async openPack() {
    const headers = this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {};
    return await this.makeRequest('POST', '/api/packs/open', {
      packId: `test-pokeball-${Date.now()}`,
      packType: 'pokeball'
    }, headers);
  }
}

// ============================================================================
// LOAD TEST RUNNER
// ============================================================================

class LoadTestRunner {
  constructor(baseUrl, concurrentUsers, duration) {
    this.baseUrl = baseUrl;
    this.concurrentUsers = concurrentUsers;
    this.duration = duration * 1000; // Convert to milliseconds
    this.metrics = new PerformanceMetrics();
    this.isRunning = false;
  }

  async runTest() {
    console.log(`🚀 Starting load test with ${this.concurrentUsers} concurrent users for ${this.duration / 1000} seconds`);
    console.log(`📊 Target: ${this.baseUrl}`);
    
    this.isRunning = true;
    const startTime = Date.now();
    
    // Start concurrent user simulations
    const userPromises = [];
    for (let i = 0; i < this.concurrentUsers; i++) {
      userPromises.push(this.simulateUser(i));
    }

    // Wait for test duration
    await new Promise(resolve => setTimeout(resolve, this.duration));
    
    this.isRunning = false;
    console.log('⏹️  Stopping load test...');
    
    // Wait for all users to finish
    await Promise.all(userPromises);
    
    const endTime = Date.now();
    const actualDuration = (endTime - startTime) / 1000;
    
    console.log(`✅ Load test completed in ${actualDuration.toFixed(2)} seconds`);
    
    return this.metrics.getSummary();
  }

  async simulateUser(userId) {
    const scenarios = new TestScenarios(this.baseUrl);
    
    while (this.isRunning) {
      try {
        // Random scenario selection
        const scenario = Math.random();
        
        if (scenario < 0.1) {
          // 10% - Health check
          const result = await scenarios.healthCheck();
          this.metrics.recordRequest('/api/health', 'GET', result.responseTime, result.statusCode, result.error);
        } else if (scenario < 0.3) {
          // 20% - Pack operations
          const packType = Math.random();
          let result;
          if (packType < 0.33) {
            result = await scenarios.getMysteryPacks();
            this.metrics.recordRequest('/api/packs/mystery', 'GET', result.responseTime, result.statusCode, result.error);
          } else if (packType < 0.66) {
            result = await scenarios.getClassicPacks();
            this.metrics.recordRequest('/api/packs/classic', 'GET', result.responseTime, result.statusCode, result.error);
          } else {
            result = await scenarios.getSpecialPacks();
            this.metrics.recordRequest('/api/packs/special', 'GET', result.responseTime, result.statusCode, result.error);
          }
        } else if (scenario < 0.5) {
          // 20% - Vault operations
          const result = await scenarios.getVault();
          this.metrics.recordRequest('/api/vault', 'GET', result.responseTime, result.statusCode, result.error);
        } else if (scenario < 0.7) {
          // 20% - Global feed
          const result = await scenarios.getGlobalFeed();
          this.metrics.recordRequest('/api/feed', 'GET', result.responseTime, result.statusCode, result.error);
        } else if (scenario < 0.8) {
          // 10% - Authentication
          const authType = Math.random();
          let result;
          if (authType < 0.5) {
            result = await scenarios.registerUser();
            this.metrics.recordRequest('/api/register', 'POST', result.responseTime, result.statusCode, result.error);
          } else {
            result = await scenarios.loginUser();
            this.metrics.recordRequest('/api/login', 'POST', result.responseTime, result.statusCode, result.error);
          }
        } else {
          // 20% - Pack opening
          const result = await scenarios.openPack();
          this.metrics.recordRequest('/api/packs/open', 'POST', result.responseTime, result.statusCode, result.error);
        }
        
        // Random delay between requests (100ms to 1000ms)
        await new Promise(resolve => setTimeout(resolve, Math.random() * 900 + 100));
        
      } catch (error) {
        console.error(`User ${userId} error:`, error.message);
      }
    }
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function runPerformanceTest() {
  const runner = new LoadTestRunner(BASE_URL, CONCURRENT_USERS, TEST_DURATION);
  
  try {
    const summary = await runner.runTest();
    
    console.log('\n📊 PERFORMANCE TEST RESULTS');
    console.log('============================');
    console.log(`Total Requests: ${summary.totalRequests}`);
    console.log(`Total Errors: ${summary.totalErrors}`);
    console.log(`Error Rate: ${summary.errorRate}%`);
    console.log(`Average Response Time: ${summary.avgResponseTime}ms`);
    console.log(`95th Percentile: ${summary.p95ResponseTime}ms`);
    console.log(`99th Percentile: ${summary.p99ResponseTime}ms`);
    console.log(`Requests/Second: ${summary.requestsPerSecond}`);
    console.log(`Test Duration: ${summary.duration.toFixed(2)}s`);
    
    console.log('\n📈 ENDPOINT BREAKDOWN');
    console.log('====================');
    const breakdown = runner.metrics.getEndpointBreakdown();
    Object.entries(breakdown).forEach(([endpoint, data]) => {
      console.log(`${endpoint}:`);
      console.log(`  Count: ${data.count}`);
      console.log(`  Avg Time: ${data.avgTime.toFixed(2)}ms`);
      console.log(`  Error Rate: ${data.errorRate.toFixed(2)}%`);
    });
    
    // Performance thresholds
    console.log('\n🎯 PERFORMANCE THRESHOLDS');
    console.log('=========================');
    const avgTime = parseFloat(summary.avgResponseTime);
    const p95Time = parseFloat(summary.p95ResponseTime);
    const errorRate = parseFloat(summary.errorRate);
    
    console.log(`Average Response Time: ${avgTime <= 500 ? '✅' : '❌'} ${avgTime}ms (target: ≤500ms)`);
    console.log(`95th Percentile: ${p95Time <= 2000 ? '✅' : '❌'} ${p95Time}ms (target: ≤2000ms)`);
    console.log(`Error Rate: ${errorRate <= 5 ? '✅' : '❌'} ${errorRate}% (target: ≤5%)`);
    
  } catch (error) {
    console.error('❌ Performance test failed:', error);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  runPerformanceTest();
}

module.exports = {
  LoadTestRunner,
  PerformanceMetrics,
  TestScenarios
};
