Feature: Guarding and routing the Function URL
  As the flight tracker backend
  I want the function to refuse callers without the secret and name the paths it serves
  So that nothing reaches AeroLOPA on behalf of a stranger or a typo

  Scenario: A call without the bearer secret is refused before anything is fetched
    Given AeroLOPA publishes the layouts "lh-32n"
    When I request "/layouts" without the secret
    Then the response status should be 401
    And the response body should contain:
      """
      {
        "error": {
          "code": "UNAUTHORIZED",
          "message": "The Authorization header is missing or wrong.",
          "status": 401
        }
      }
      """
    And AeroLOPA should have been asked for the layout index 0 times

  Scenario: An unknown path names the ones that exist
    When I request "/aerolopa/seatmap?slug=lh-32n"
    Then the response status should be 404
    And the response body should contain:
      """
      {
        "error": {
          "code": "NOT_FOUND",
          "message": "Unknown function. Expected one of /seatmap, /layouts.",
          "status": 404
        }
      }
      """
