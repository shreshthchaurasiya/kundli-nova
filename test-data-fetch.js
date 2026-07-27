async function run() {
  const dataUri = 'data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==';
  try {
    const res = await fetch(dataUri);
    const text = await res.text();
    console.log('Result:', text);
  } catch (e) {
    console.error('Error:', e.message);
  }
}
run();
