import requests
import time
import concurrent.futures
import os
from statistics import mean
import argparse
from typing import List, Dict

def load_image() -> bytes:
    """Load the test image"""
    image_path = os.path.join(os.path.dirname(__file__), "sample.png")
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image file not found: {image_path}")

    with open(image_path, "rb") as image_file:
        return image_file.read()

def make_request(url: str, image_data: bytes) -> Dict:
    """Make a single request to the API"""
    files = {"file": ("sample.png", image_data, "image/png")}
    start_time = time.time()
    response = requests.post(f"{url}/predict", files=files)
    end_time = time.time()
    return {
        "status_code": response.status_code,
        "response_time": end_time - start_time,
        "success": response.status_code == 200,
    }

def run_load_test(
    url: str, num_requests: int, max_workers: int, image_data: bytes
) -> List[Dict]:
    """Run concurrent load test"""
    results = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [
            executor.submit(make_request, url, image_data) for _ in range(num_requests)
        ]

        for future in concurrent.futures.as_completed(futures):
            try:
                result = future.result()
                results.append(result)
            except Exception as e:
                results.append(
                    {
                        "status_code": None,
                        "response_time": None,
                        "success": False,
                        "error": str(e),
                    }
                )

    return results

def analyze_results(results: List[Dict]) -> Dict:
    """Analyze test results"""
    successful_requests = [r for r in results if r["success"]]
    failed_requests = [r for r in results if not r["success"]]
    response_times = [r["response_time"] for r in successful_requests]

    if not response_times:
        return {
            "total_requests": len(results),
            "successful_requests": 0,
            "failed_requests": len(failed_requests),
            "avg_response_time": None,
            "requests_per_second": 0,
        }

    total_time = sum(response_times)
    return {
        "total_requests": len(results),
        "successful_requests": len(successful_requests),
        "failed_requests": len(failed_requests),
        "avg_response_time": mean(response_times),
        "min_response_time": min(response_times),
        "max_response_time": max(response_times),
        "requests_per_second": len(successful_requests) / total_time,
    }

def main():
    url = "http://k8s-default-modelser-3b1e80da26-1539415395.ap-south-1.elb.amazonaws.com"
    num_requests = 10000
    num_workers = 10

    print(f"\nStarting load test with {num_requests} requests using {num_workers} workers")
    print(f"Target URL: {url}\n")

    try:
        # Load image once
        image_data = load_image()

        # Run health check
        health_response = requests.get(f"{url}/health")
        print(f"Health check status: {health_response.status_code}")
        print(f"Health check response: {health_response.json()}\n")

        # Run load test
        start_time = time.time()
        results = run_load_test(url, num_requests, num_workers, image_data)
        total_time = time.time() - start_time

        # Analyze results
        analysis = analyze_results(results)

        # Print results
        print("\nTest Results:")
        print("-" * 50)
        print(f"Total time: {total_time:.2f} seconds")
        print(f"Total requests: {analysis['total_requests']}")
        print(f"Successful requests: {analysis['successful_requests']}")
        print(f"Failed requests: {analysis['failed_requests']}")
        if analysis["avg_response_time"]:
            print(f"Average response time: {analysis['avg_response_time']*1000:.2f} ms")
            print(f"Min response time: {analysis['min_response_time']*1000:.2f} ms")
            print(f"Max response time: {analysis['max_response_time']*1000:.2f} ms")
        print(f"Requests per second: {analysis['requests_per_second']:.2f}")

    except Exception as e:
        print(f"Error during test: {str(e)}")

if __name__ == "__main__":
    main()