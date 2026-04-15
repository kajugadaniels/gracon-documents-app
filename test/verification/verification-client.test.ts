import test from 'node:test';
import assert from 'node:assert/strict';
import { createVerificationClient } from '../../src/api/verification/verification-client.ts';

test('submits verification with the expected multipart payload', async () => {
    const calls: Array<{
        url: string;
        data: FormData | Record<string, unknown> | undefined;
        config: { headers?: Record<string, string>; timeout?: number } | undefined;
    }> = [];

    const client = createVerificationClient({
        async get() {
            throw new Error('get should not be called');
        },
        async post(url, data, config) {
            calls.push({ url, data, config });
            return { data: { ok: true } };
        },
    });

    const idCard = new File(['id-card'], 'id-card.png', { type: 'image/png' });
    const selfie = new File(['selfie'], 'selfie.png', { type: 'image/png' });

    await client.submitVerification(
        '1234567890123456',
        idCard,
        selfie,
        'INVITATION',
    );

    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.url, '/verification/submit');
    assert.equal(calls[0]?.config?.timeout, 60_000);
    assert.equal(
        calls[0]?.config?.headers?.['Content-Type'],
        'multipart/form-data',
    );
    assert.ok(calls[0]?.data instanceof FormData);
    assert.equal(calls[0]?.data.get('documentNumber'), '1234567890123456');
    assert.equal(calls[0]?.data.get('challengeMode'), 'INVITATION');
    assert.equal(calls[0]?.data.get('idCard'), idCard);
    assert.equal(calls[0]?.data.get('selfie'), selfie);
});

test('fetches verification status from the expected endpoint', async () => {
    const requests: string[] = [];
    const client = createVerificationClient({
        async get(url) {
            requests.push(url);
            return { data: { data: { isVerified: false } } };
        },
        async post() {
            throw new Error('post should not be called');
        },
    });

    await client.getVerificationStatus();

    assert.deepEqual(requests, ['/verification/status']);
});
