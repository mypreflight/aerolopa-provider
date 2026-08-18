Feature: The service contract
  As the flight tracker backend
  I want the service to describe itself and reject malformed calls
  So that integrating against it does not rely on guesswork

  Scenario: The health probe answers
    When I send a "GET" request to "/health"
    Then the response status should be 200
    And the response body should contain:
      """
      { "status": "ok" }
      """

  Scenario: The service publishes its own OpenAPI document
    When I send a "GET" request to "/openapi.json"
    Then the response status should be 200
    And the response body should have the property "openapi"
    And the response body should have the property "components.schemas.SeatMap"
    And the response body should have the property "paths./seatmap"

  Scenario: A request carrying no usable parameters is rejected
    When I send a "GET" request to "/seatmap"
    Then the response status should be 400
    And the response body should contain:
      """
      {
        "error": {
          "code": "BAD_REQUEST",
          "message": "Provide slug, or airline and aircraft, or op=configurations.",
          "status": 400
        }
      }
      """

  Scenario: An unknown operation is rejected
    When I send a "GET" request to "/seatmap?op=teleport"
    Then the response status should be 400
    And the response body should have the property "error.code"

  Scenario: A resolve request missing the aircraft is rejected
    When I send a "GET" request to "/seatmap?airline=LH"
    Then the response status should be 400
    And the response body should contain:
      """
      {
        "error": {
          "code": "BAD_REQUEST",
          "message": "Parameters airline and aircraft are required for op=resolve.",
          "status": 400
        }
      }
      """

  Scenario: An unknown path is rejected
    When I send a "GET" request to "/admin"
    Then the response status should be 404
    And the response body should contain:
      """
      {
        "error": {
          "code": "NOT_FOUND",
          "message": "Unknown path /admin.",
          "status": 404
        }
      }
      """

  Scenario: A write method is rejected
    When I send a "POST" request to "/seatmap?slug=lh-32n"
    Then the response status should be 405
    And the response body should contain:
      """
      {
        "error": {
          "code": "METHOD_NOT_ALLOWED",
          "message": "Only GET is supported.",
          "status": 405
        }
      }
      """
