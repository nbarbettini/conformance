const checks = [
  {
    id: "check-001",
    name: "Basic Auth Check",
    description: "Validates basic authentication flow",
    status: "SUCCESS",
    timestamp: new Date().toISOString(),
    specReferences: [
      {
        id: "rfc6750",
        url: "https://tools.ietf.org/html/rfc6750"
      }
    ],
    details: {
      authType: "Bearer",
      responseTime: 45
    },
    logs: [
      "Auth endpoint reached",
      "Token validated successfully"
    ]
  },
  {
    id: "check-002",
    name: "Token Expiry Check",
    description: "Validates token expiration handling",
    status: "FAILURE",
    timestamp: new Date().toISOString(),
    errorMessage: "Token expiry not properly enforced",
    logs: [
      "Token validation started",
      "Expiry check failed"
    ]
  },
  {
    id: "check-003",
    name: "CORS Header Check",
    description: "Validates CORS headers in response",
    status: "WARNING",
    timestamp: new Date().toISOString(),
    details: {
      missingHeaders: ["Access-Control-Allow-Credentials"]
    }
  }
];

console.log(JSON.stringify(checks, null, 2));
