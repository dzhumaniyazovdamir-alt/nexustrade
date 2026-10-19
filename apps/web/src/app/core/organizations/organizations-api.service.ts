import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  AcceptInvitationRequest,
  ChangeMembershipRoleRequest,
  CreateInvitationRequest,
  CreateInvitationResponse,
  CreateOrganizationRequest,
  InvitationsResponse,
  MembershipsResponse,
  OrganizationResponse,
  OrganizationsResponse,
  UpdateOrganizationRequest,
} from '@nexustrade/contracts';

@Injectable({ providedIn: 'root' })
export class OrganizationsApiService {
  private readonly http = inject(HttpClient);

  list() {
    return this.http.get<OrganizationsResponse>('/api/v1/organizations');
  }

  create(body: CreateOrganizationRequest) {
    return this.http.post<OrganizationResponse>('/api/v1/organizations', body);
  }

  update(organizationId: string, body: UpdateOrganizationRequest) {
    return this.http.patch<OrganizationResponse>(`/api/v1/organizations/${organizationId}`, body);
  }

  members(organizationId: string) {
    return this.http.get<MembershipsResponse>(`/api/v1/organizations/${organizationId}/members`);
  }

  invite(organizationId: string, body: CreateInvitationRequest) {
    return this.http.post<CreateInvitationResponse>(
      `/api/v1/organizations/${organizationId}/invitations`,
      body,
    );
  }

  invitations(organizationId: string) {
    return this.http.get<InvitationsResponse>(
      `/api/v1/organizations/${organizationId}/invitations`,
    );
  }

  revokeInvitation(organizationId: string, invitationId: string) {
    return this.http.delete<void>(
      `/api/v1/organizations/${organizationId}/invitations/${invitationId}`,
    );
  }

  accept(body: AcceptInvitationRequest) {
    return this.http.post<OrganizationResponse>('/api/v1/organizations/invitations/accept', body);
  }

  changeRole(organizationId: string, userId: string, body: ChangeMembershipRoleRequest) {
    return this.http.patch<void>(
      `/api/v1/organizations/${organizationId}/members/${userId}/role`,
      body,
    );
  }

  removeMember(organizationId: string, userId: string) {
    return this.http.delete<void>(`/api/v1/organizations/${organizationId}/members/${userId}`);
  }
}
