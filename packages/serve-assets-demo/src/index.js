import request from 'then-request';

document.body.textContent = 'Hello World';

request('GET', '/ajax-ftw')
  .getBody()
  .done(result => {
    document.body.textContent = 'Hello World. Process ID: ' + result;
  });
