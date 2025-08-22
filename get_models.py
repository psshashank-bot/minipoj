#!/usr/bin/env python3
import os, sys, urllib.request

URLS = {
  "tiny_face_detector_model-weights_manifest.json":
    "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json",
  "tiny_face_detector_model-shard1":
    "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-shard1",
  "face_expression_model-weights_manifest.json":
    "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_expression_model-weights_manifest.json",
  "face_expression_model-shard1":
    "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_expression_model-shard1",
}

def main():
  models_dir = os.path.join(os.path.dirname(__file__), "models")
  os.makedirs(models_dir, exist_ok=True)

  for name, url in URLS.items():
    dest = os.path.join(models_dir, name)
    print(f"Downloading {name} ...")
    try:
      urllib.request.urlretrieve(url, dest)
      print(f"  saved to {dest}")
    except Exception as e:
      print(f"  failed: {e}")
      print("Please check your internet connection or download manually from the face-api.js repo.")
      return 1

  print("\nAll models downloaded. You can now refresh the app and start detection.")
  return 0

if __name__ == "__main__":
  sys.exit(main())