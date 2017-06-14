import { User } from "./../../../app/shared/model/user.data";
import { UserFactory } from "./../../../app/shared/services/user.factory";
import { TestBed, async, inject, fakeAsync } from "@angular/core/testing";
import { MockBackend, MockConnection } from "@angular/http/testing";
import { Http, HttpModule, Response, BaseRequestOptions, ResponseOptions } from "@angular/http";
import { ErrorService } from "./error/error.service";

describe("user.factory.ts", () => {

    beforeEach(() => {

        TestBed.configureTestingModule({
            imports: [HttpModule],
            providers: [

                UserFactory
                ,
                {
                    provide: Http,
                    useFactory: (mockBackend: MockBackend, options: BaseRequestOptions) => {
                        return new Http(mockBackend, options);
                    },
                    deps: [MockBackend, BaseRequestOptions]
                },
                MockBackend,
                BaseRequestOptions,
                ErrorService
            ]
        });

        spyOn(ErrorService.prototype, "handleError");

    });


    describe("getAll", () => {
        it("should call correct REST API endpoint when no parameters", async(inject([UserFactory, MockBackend, ErrorService], (target: UserFactory, mockBackend: MockBackend, mockErrorService: ErrorService) => {

            let mockUser = jasmine.createSpyObj("User", ["deserialize"]);
            let spyCreate = spyOn(User, "create").and.returnValue(mockUser);
            let spyDeserialize = mockUser.deserialize.and.returnValue(new User({ name: "Deserialized" }));

            const mockResponse = [
                { id: 1, uniqueId: "uniqueId1", name: "First", email: "first@domain.com", picture: "http://seemyface/user.jpg" },
                { id: 2, uniqueId: "uniqueId2", name: "Second", email: "second@domain.com" },
                { id: 3, uniqueId: "uniqueId3", name: "Third" },
                { id: 3, uniqueId: "uniqueId4" }
            ];

            mockBackend.connections.subscribe((connection: MockConnection) => {
                if (connection.request.url === "/api/v1/users/") {
                    connection.mockRespond(new Response(new ResponseOptions({
                        body: JSON.stringify(mockResponse)
                    })));
                }
                else {
                    throw new Error(connection.request.url + " is not setup.");
                }
            });

            target.getAll().then(users => {
                expect(spyCreate).toHaveBeenCalled()
                expect(spyDeserialize).toHaveBeenCalled();
                expect(users.length).toBe(4);
                users.forEach(function (element) {
                    expect(element).toEqual(jasmine.any(User));
                })
            });
        })));

        it("should call correct REST API endpoint when pattern search parameter", async(inject([UserFactory, MockBackend, ErrorService], (target: UserFactory, mockBackend: MockBackend, mockErrorService: ErrorService) => {

            let mockUser = jasmine.createSpyObj("User", ["deserialize"]);
            let spyCreate = spyOn(User, "create").and.returnValue(mockUser);
            let spyDeserialize = mockUser.deserialize.and.returnValue(new User({ name: "Deserialized" }));

            const mockResponse = [
                { id: 1, uniqueId: "uniqueId1", name: "First", email: "first@domain.com", picture: "http://seemyface/user.jpg" },
                { id: 2, uniqueId: "uniqueId2", name: "Second", email: "second@domain.com" },
                { id: 3, uniqueId: "uniqueId3", name: "Third" },
                { id: 3, uniqueId: "uniqueId4" }
            ];

            mockBackend.connections.subscribe((connection: MockConnection) => {
                if (connection.request.url === "/api/v1/users/searched") {
                    connection.mockRespond(new Response(new ResponseOptions({
                        body: JSON.stringify(mockResponse)
                    })));
                }
                else {
                    throw new Error(connection.request.url + " is not setup.");
                }
            });

            target.getAll("searched").then(users => {
                expect(spyCreate).toHaveBeenCalled()
                expect(spyDeserialize).toHaveBeenCalled();
                expect(users.length).toBe(4);
                users.forEach(function (element) {
                    expect(element).toEqual(jasmine.any(User));
                })
            });
        })));
    });

    describe("get", () => {
        it("should call correct REST API endpoint", fakeAsync(inject([UserFactory, MockBackend, ErrorService], (target: UserFactory, mockBackend: MockBackend, mockErrorService: ErrorService) => {
            let mockUser = jasmine.createSpyObj("User", ["deserialize"]);
            let spyCreate = spyOn(User, "create").and.returnValue(mockUser);
            let spyDeserialize = mockUser.deserialize.and.returnValue(new User({ name: "Deserialized" }));

            const mockResponse = [
                { id: 1, uniqueId: "uniqueId1", name: "First", email: "first@domain.com", picture: "http://seemyface/user.jpg" }
            ];

            mockBackend.connections.subscribe((connection: MockConnection) => {
                if (connection.request.url === "/api/v1/user/someId") {
                    connection.mockRespond(new Response(new ResponseOptions({
                        body: JSON.stringify(mockResponse)
                    })));
                }
                else {
                    throw new Error(connection.request.url + " is not setup.");
                }
            });

            target.get("someId").then(user => {
                expect(spyCreate).toHaveBeenCalled()
                expect(spyDeserialize).toHaveBeenCalled();
                expect(user).toBeDefined();
                expect(user.name).toBe("Deserialized");
            });
        })));
    });

    describe("create", () => {
        it("should call correct REST API endpoint", fakeAsync(inject([UserFactory, MockBackend, ErrorService], (target: UserFactory, mockBackend: MockBackend, mockErrorService: ErrorService) => {
            let mockUser = jasmine.createSpyObj("User", ["deserialize"]);
            let spyCreate = spyOn(User, "create").and.returnValue(mockUser);
            let spyDeserialize = mockUser.deserialize.and.returnValue(new User({ name: "Created" }));

            const mockResponse = [
                { id: 1, uniqueId: "uniqueId1", name: "First", email: "first@domain.com", picture: "http://seemyface/user.jpg" }
            ];

            mockBackend.connections.subscribe((connection: MockConnection) => {
                if (connection.request.url === "/api/v1/user") {
                    connection.mockRespond(new Response(new ResponseOptions({
                        body: JSON.stringify(mockResponse)
                    })));
                }
                else {
                    throw new Error(connection.request.url + " is not setup.");
                }
            });

            let user = new User({ user_id: "12", name: "Me" });
            target.create(user).then(user => {
                expect(spyCreate).toHaveBeenCalled()
                expect(spyDeserialize).toHaveBeenCalled();
                expect(user).toBeDefined();
                expect(user.name).toBe("Created");
            });
        })));
    });

    describe("update", () => {
        it("should call correct REST API endpoint", fakeAsync(inject([UserFactory, MockBackend, ErrorService], (target: UserFactory, mockBackend: MockBackend, mockErrorService: ErrorService) => {

            const mockResponse = true;

            mockBackend.connections.subscribe((connection: MockConnection) => {
                if (connection.request.url === "/api/v1/user/someId") {
                    connection.mockRespond(new Response(new ResponseOptions({
                        body: JSON.stringify(mockResponse)
                    })));
                }
                else {
                    throw new Error(connection.request.url + " is not setup.");
                }
            });

            let user = new User({ name: "New name", user_id: "someId" });
            target.upsert(user).then(response => {
                expect(response).toBe(true);
            });
        })));
    });

});



