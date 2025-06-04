const fetch = require('node-fetch');

async function testAPI() {
  try {
    const response = await fetch('http://localhost:5000/api/territories/Wiradjuri/details');
    const data = await response.json();
    console.log('Territory Details API Response:');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testAPI();