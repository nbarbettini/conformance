import { ClientScenario, ConformanceCheck } from '../../../../types';
import { fetchAsMetadata } from '../helpers/as-metadata';
import { ServerAuthSpecReferences } from '../spec-references';

type HttpProbeResult = {
  status: number;
  headers: Headers;
  bodyText: string;
  bodyJson?: unknown;
};

async function probeHttp(
  url: string,
  options: {
    method: string;
    headers?: Record<string, string>;
    body?: string;
  }
): Promise<HttpProbeResult> {
  const response = await fetch(url, {
    method: options.method,
    headers: options.headers,
    body: options.body
  });

  const bodyText = await response.text();
  let bodyJson: unknown;
  try {
    bodyJson = JSON.parse(bodyText);
  } catch {
    bodyJson = undefined;
  }

  return {
    status: response.status,
    headers: response.headers,
    bodyText,
    bodyJson
  };
}

export class AuthDcrEndpointValidationScenario implements ClientScenario {
  name = 'server/auth-dcr-endpoint-validation';
  description = `Validate observable Dynamic Client Registration (RFC 7591) endpoint behavior.

**Checks**:
- registration_endpoint exists and uses HTTPS
- registration endpoint rejects GET
- registration endpoint expects JSON POSTs
- successful registration response shape checks when 201 is returned`;

  async run(serverUrl: string): Promise<ConformanceCheck[]> {
    const checks: ConformanceCheck[] = [];
    const timestamp = () => new Date().toISOString();

    const asResult = await fetchAsMetadata(serverUrl);

    if (!asResult.success || !asResult.metadata) {
      checks.push({
        id: 'auth-dcr-prerequisite',
        name: 'DCR Prerequisite',
        description: 'Valid authorization server metadata available',
        status: 'SKIPPED',
        timestamp: timestamp(),
        errorMessage:
          asResult.error ||
          'Cannot fetch AS metadata - run auth-as-metadata-discovery first',
        specReferences: [ServerAuthSpecReferences.RFC_8414_AS_DISCOVERY]
      });
      return checks;
    }

    const metadata = asResult.metadata;
    const registrationEndpoint = metadata.registration_endpoint;

    if (typeof registrationEndpoint !== 'string' || registrationEndpoint.length === 0) {
      checks.push({
        id: 'auth-dcr-endpoint-present',
        name: 'DCR Endpoint Present',
        description: 'AS metadata advertises registration_endpoint',
        status: 'SKIPPED',
        timestamp: timestamp(),
        errorMessage: 'AS metadata does not include registration_endpoint',
        specReferences: [
          ServerAuthSpecReferences.RFC_8414_AS_FIELDS,
          ServerAuthSpecReferences.RFC_7591_DCR_ENDPOINT
        ]
      });
      return checks;
    }

    checks.push({
      id: 'auth-dcr-endpoint-present',
      name: 'DCR Endpoint Present',
      description: 'AS metadata advertises registration_endpoint',
      status: 'SUCCESS',
      timestamp: timestamp(),
      details: {
        registrationEndpoint
      }
    });

    let endpointUrl: URL;
    try {
      endpointUrl = new URL(registrationEndpoint);
    } catch {
      checks.push({
        id: 'auth-dcr-endpoint-https',
        name: 'DCR Endpoint Uses HTTPS',
        description: 'Client registration endpoint uses HTTPS',
        status: 'FAILURE',
        timestamp: timestamp(),
        errorMessage: `Invalid registration_endpoint URL: ${registrationEndpoint}`,
        specReferences: [ServerAuthSpecReferences.RFC_7591_DCR_ENDPOINT]
      });
      return checks;
    }

    checks.push({
      id: 'auth-dcr-endpoint-https',
      name: 'DCR Endpoint Uses HTTPS',
      description: 'Client registration endpoint uses HTTPS',
      status: endpointUrl.protocol === 'https:' ? 'SUCCESS' : 'FAILURE',
      timestamp: timestamp(),
      errorMessage:
        endpointUrl.protocol === 'https:'
          ? undefined
          : `registration_endpoint uses ${endpointUrl.protocol}, expected https:`,
      specReferences: [ServerAuthSpecReferences.RFC_7591_DCR_ENDPOINT],
      details: {
        registrationEndpoint,
        protocol: endpointUrl.protocol
      }
    });

    let getProbe: HttpProbeResult | undefined;
    try {
      getProbe = await probeHttp(registrationEndpoint, {
        method: 'GET'
      });

      checks.push({
        id: 'auth-dcr-endpoint-post-only',
        name: 'DCR Endpoint Rejects GET',
        description: 'Client registration endpoint rejects GET requests',
        status: getProbe.status >= 400 ? 'SUCCESS' : 'FAILURE',
        timestamp: timestamp(),
        errorMessage:
          getProbe.status >= 400
            ? undefined
            : `Expected GET to be rejected (4xx/5xx), got ${getProbe.status}`,
        specReferences: [ServerAuthSpecReferences.RFC_7591_DCR_ENDPOINT],
        details: {
          status: getProbe.status
        }
      });
    } catch (error) {
      checks.push({
        id: 'auth-dcr-endpoint-post-only',
        name: 'DCR Endpoint Rejects GET',
        description: 'Client registration endpoint rejects GET requests',
        status: 'FAILURE',
        timestamp: timestamp(),
        errorMessage: `GET probe failed: ${error instanceof Error ? error.message : String(error)}`,
        specReferences: [ServerAuthSpecReferences.RFC_7591_DCR_ENDPOINT]
      });
    }

    let badContentProbe: HttpProbeResult | undefined;
    try {
      badContentProbe = await probeHttp(registrationEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: 'not-json'
      });

      checks.push({
        id: 'auth-dcr-request-content-type-json',
        name: 'DCR Request Content-Type',
        description: 'Registration endpoint enforces application/json requests',
        status: badContentProbe.status >= 400 ? 'SUCCESS' : 'FAILURE',
        timestamp: timestamp(),
        errorMessage:
          badContentProbe.status >= 400
            ? undefined
            : `Expected non-JSON request to be rejected, got ${badContentProbe.status}`,
        specReferences: [
          ServerAuthSpecReferences.RFC_7591_DCR_REQUEST,
          ServerAuthSpecReferences.RFC_7591_DCR_ENDPOINT
        ],
        details: {
          status: badContentProbe.status
        }
      });

      if (badContentProbe.status === 400) {
        const contentType = badContentProbe.headers.get('content-type') ?? '';
        const body = badContentProbe.bodyJson;
        const errorCode =
          body && typeof body === 'object' && !Array.isArray(body)
            ? (body as Record<string, unknown>).error
            : undefined;

        checks.push({
          id: 'auth-dcr-error-response-format',
          name: 'DCR Error Response Format',
          description: 'Registration error response uses JSON with an ASCII error code',
          status:
            contentType.includes('application/json') &&
            typeof errorCode === 'string' &&
            /^[\x20-\x7E]+$/.test(errorCode)
              ? 'SUCCESS'
              : 'WARNING',
          timestamp: timestamp(),
          errorMessage:
            contentType.includes('application/json') &&
            typeof errorCode === 'string' &&
            /^[\x20-\x7E]+$/.test(errorCode)
              ? undefined
              : '400 response did not clearly match RFC 7591 error JSON format',
          specReferences: [ServerAuthSpecReferences.RFC_7591_DCR_RESPONSE],
          details: {
            status: badContentProbe.status,
            contentType,
            body
          }
        });
      } else {
        checks.push({
          id: 'auth-dcr-error-response-format',
          name: 'DCR Error Response Format',
          description: 'Registration error response uses JSON with an ASCII error code',
          status: 'SKIPPED',
          timestamp: timestamp(),
          errorMessage:
            `Malformed request returned ${badContentProbe.status}; RFC 7591 400-shape check not applicable`,
          specReferences: [ServerAuthSpecReferences.RFC_7591_DCR_RESPONSE],
          details: {
            status: badContentProbe.status
          }
        });
      }
    } catch (error) {
      checks.push({
        id: 'auth-dcr-request-content-type-json',
        name: 'DCR Request Content-Type',
        description: 'Registration endpoint enforces application/json requests',
        status: 'FAILURE',
        timestamp: timestamp(),
        errorMessage: `POST probe failed: ${error instanceof Error ? error.message : String(error)}`,
        specReferences: [
          ServerAuthSpecReferences.RFC_7591_DCR_REQUEST,
          ServerAuthSpecReferences.RFC_7591_DCR_ENDPOINT
        ]
      });
    }

    const registrationPayload = {
      client_name: 'mcpdebugger-conformance',
      redirect_uris: ['https://client.example/callback']
    };

    let successProbe: HttpProbeResult | undefined;
    try {
      successProbe = await probeHttp(registrationEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(registrationPayload)
      });
    } catch (error) {
      checks.push({
        id: 'auth-dcr-success-response-shape',
        name: 'DCR Success Response Shape',
        description: 'Successful registration response has required fields',
        status: 'SKIPPED',
        timestamp: timestamp(),
        errorMessage: `Could not probe JSON registration request: ${error instanceof Error ? error.message : String(error)}`,
        specReferences: [ServerAuthSpecReferences.RFC_7591_DCR_RESPONSE]
      });
      return checks;
    }

    checks.push({
      id: 'auth-dcr-endpoint-accepts-post',
      name: 'DCR Endpoint Accepts POST',
      description: 'Client registration endpoint accepts POST requests',
      status:
        successProbe.status !== 405 &&
        successProbe.status !== 501 &&
        successProbe.status !== 404
          ? 'SUCCESS'
          : 'FAILURE',
      timestamp: timestamp(),
      errorMessage:
        successProbe.status !== 405 &&
        successProbe.status !== 501 &&
        successProbe.status !== 404
          ? undefined
          : `Registration endpoint did not accept POST (HTTP ${successProbe.status})`,
      specReferences: [ServerAuthSpecReferences.RFC_7591_DCR_ENDPOINT],
      details: {
        status: successProbe.status
      }
    });

    if (successProbe.status !== 201) {
      checks.push({
        id: 'auth-dcr-success-response-shape',
        name: 'DCR Success Response Shape',
        description: 'Successful registration response has required fields',
        status: 'SKIPPED',
        timestamp: timestamp(),
        errorMessage: `Registration attempt returned ${successProbe.status}; success-shape checks apply only when 201 is returned`,
        specReferences: [ServerAuthSpecReferences.RFC_7591_DCR_RESPONSE],
        details: {
          status: successProbe.status
        }
      });
      return checks;
    }

    const contentType = successProbe.headers.get('content-type') ?? '';
    const responseBody = successProbe.bodyJson;
    const isObject =
      typeof responseBody === 'object' &&
      responseBody !== null &&
      !Array.isArray(responseBody);
    const clientId = isObject
      ? (responseBody as Record<string, unknown>).client_id
      : undefined;
    const clientSecret = isObject
      ? (responseBody as Record<string, unknown>).client_secret
      : undefined;
    const clientSecretExpiresAt = isObject
      ? (responseBody as Record<string, unknown>).client_secret_expires_at
      : undefined;

    checks.push({
      id: 'auth-dcr-success-response-shape',
      name: 'DCR Success Response Shape',
      description: 'Successful registration response uses HTTP 201 and JSON body',
      status: contentType.includes('application/json') && isObject ? 'SUCCESS' : 'FAILURE',
      timestamp: timestamp(),
      errorMessage:
        contentType.includes('application/json') && isObject
          ? undefined
          : 'Expected HTTP 201 application/json object response',
      specReferences: [ServerAuthSpecReferences.RFC_7591_DCR_RESPONSE],
      details: {
        status: successProbe.status,
        contentType,
        body: responseBody
      }
    });

    checks.push({
      id: 'auth-dcr-success-has-client-id',
      name: 'DCR Response Includes client_id',
      description: 'Successful registration response includes client_id',
      status: typeof clientId === 'string' && clientId.length > 0 ? 'SUCCESS' : 'FAILURE',
      timestamp: timestamp(),
      errorMessage:
        typeof clientId === 'string' && clientId.length > 0
          ? undefined
          : 'Missing or invalid client_id in successful response',
      specReferences: [ServerAuthSpecReferences.RFC_7591_DCR_RESPONSE],
      details: {
        client_id: clientId
      }
    });

    checks.push({
      id: 'auth-dcr-client-secret-expiry',
      name: 'DCR client_secret_expires_at Requirement',
      description: 'If client_secret is issued, client_secret_expires_at is present',
      status:
        clientSecret === undefined ||
        typeof clientSecretExpiresAt === 'number'
          ? 'SUCCESS'
          : 'FAILURE',
      timestamp: timestamp(),
      errorMessage:
        clientSecret === undefined || typeof clientSecretExpiresAt === 'number'
          ? undefined
          : 'client_secret present but client_secret_expires_at missing or invalid',
      specReferences: [ServerAuthSpecReferences.RFC_7591_DCR_RESPONSE],
      details: {
        client_secret_present: clientSecret !== undefined,
        client_secret_expires_at: clientSecretExpiresAt
      }
    });

    const responseRecord = responseBody as Record<string, unknown>;
    const missingRegisteredKeys = Object.keys(registrationPayload).filter(
      (key) => !Object.prototype.hasOwnProperty.call(responseRecord, key)
    );

    checks.push({
      id: 'auth-dcr-returns-registered-metadata',
      name: 'DCR Response Returns Registered Metadata',
      description:
        'Successful registration response returns requested metadata as top-level members',
      status: missingRegisteredKeys.length === 0 ? 'SUCCESS' : 'FAILURE',
      timestamp: timestamp(),
      errorMessage:
        missingRegisteredKeys.length === 0
          ? undefined
          : `Missing registered metadata keys in response: ${missingRegisteredKeys.join(', ')}`,
      specReferences: [ServerAuthSpecReferences.RFC_7591_DCR_RESPONSE],
      details: {
        requestedKeys: Object.keys(registrationPayload),
        missingKeys: missingRegisteredKeys
      }
    });

    return checks;
  }
}
