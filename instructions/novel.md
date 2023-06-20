# Novel Instructions

> How to get your Novel AI token

1. Login to Novel AI
2. Open the developer tools using one of the following methods:

   - `Ctrl + Shift + I`
   - Right click the page --> Click _Inspect_

3. Open the `Console` tab and type:

- `console.log(JSON.parse(localStorage.getItem('session')).auth_token)`

4. Copy/paste the resulting output into the `Novel API Key` field in your [NovelAI Settings Page](https://agnai.chat/settings?tab=ai&service=novelai)

The API Key will look something like this:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6Ii4uLiIsImlhdCI6MTUxNjIzOTAyMn0.pCVUFONBLI_Lw3vKQG6ykCkuWNeG4cDhdEqRO_QJbh4
```
