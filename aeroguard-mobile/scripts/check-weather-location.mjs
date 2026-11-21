import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'ios/AeroGuardMobile/ViewModels/WeatherViewModel.swift'), 'utf8');
const method = source.slice(source.indexOf('    private func handleLocationError('), source.indexOf('\n}\n\nextension WeatherViewModel'));
const temporary = mkdtempSync(join(tmpdir(), 'aeroguard-location-retry-'));
const harness = `import Foundation
import CoreLocation
@MainActor final class Manager {
    var calls = 0
    func requestLocation() { calls += 1 }
}
@MainActor final class Model {
    var requestID = UUID()
    var locationRetryCount = 0
    var locationRetryTask: Task<Void, Never>?
    var isLoading = false
    var errorMessage: String?
    let locationManager = Manager()
    func fail(_ error: Error) { handleLocationError(error) }
${method}
}
@main struct Check {
    @MainActor static func waitForCall(_ model: Model, count: Int) async throws {
        let deadline = Date().addingTimeInterval(6)
        while model.locationManager.calls < count && Date() < deadline {
            try await Task.sleep(nanoseconds: 20_000_000)
        }
        precondition(model.locationManager.calls == count, "Expected bounded retry")
    }
    @MainActor static func main() async throws {
        let unknown = NSError(domain: kCLErrorDomain, code: CLError.locationUnknown.rawValue)
        let model = Model()
        model.fail(unknown)
        precondition(model.isLoading && model.errorMessage == nil && model.locationRetryCount == 1)
        model.fail(unknown)
        precondition(model.locationRetryCount == 1, "Duplicate callback must not consume retries")
        try await waitForCall(model, count: 1)
        model.fail(unknown)
        model.fail(unknown)
        precondition(model.locationRetryCount == 2 && model.isLoading)
        try await waitForCall(model, count: 2)
        model.fail(unknown)
        precondition(!model.isLoading && model.errorMessage != nil && model.locationRetryTask == nil)
        precondition(!model.errorMessage!.contains("kCLErrorDomain"))
        let denied = Model()
        denied.fail(NSError(domain: kCLErrorDomain, code: CLError.denied.rawValue))
        precondition(!denied.isLoading && denied.locationRetryCount == 0)
        precondition(denied.errorMessage!.contains("Konum izni"))
        let cancelled = Model()
        cancelled.fail(unknown)
        cancelled.requestID = UUID()
        try await Task.sleep(nanoseconds: 2_200_000_000)
        precondition(cancelled.locationManager.calls == 0, "Old request must not retry after a new request starts")
        print("PASS: temporary location error retries, duplicate suppression, bounded failure, denied permission and obsolete request cancellation")
    }
}
`;
try {
  const file = join(temporary, 'LocationCheck.swift');
  writeFileSync(file, harness);
  const compile = spawnSync('xcrun', ['swiftc', '-swift-version', '5', '-parse-as-library', '-module-cache-path', join(temporary, 'modules'), file, '-o', join(temporary, 'check')], { encoding: 'utf8' });
  if (compile.status !== 0) throw new Error(compile.stderr || String(compile.error));
  const result = spawnSync(join(temporary, 'check'), [], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || String(result.error));
  process.stdout.write(result.stdout);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
