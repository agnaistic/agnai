# Novel Instructions

> How to get your Novel AI token

1. Login to Novel AI
2. Open the developer tools using one of the following methods:

   - `Ctrl + Shift + I`
   - Right click the page --> Click _Inspect_

3. Open the `Console` tab and type:

- `console.log(JSON.parse(localStorage.getItem('session')).auth_token)`

4. Copy/paste the resulting output into the `Novel API Key` field
