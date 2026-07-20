import { supabase } from '../../lib/supabase';
import { Astrologer } from '../../types';
import { ASTROLOGER_UPLOAD_LIMITS } from './constants';
import {
  AstrologerApplication,
  AstrologerApplicationDraft,
  AstrologerApplicationStatus,
  AstrologerPublicProfileDraft,
} from './types';

type ApplicationRow = {
  id: string;
  user_id: string;
  status: AstrologerApplicationStatus;
  legal_name: string | null;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  pan_number: string | null;
  experience_years: number | null;
  languages: string[] | null;
  skills: string[] | null;
  qualification: string | null;
  consultation_modes: string[] | null;
  about: string | null;
  requested_price_per_minute: number | string | null;
  profile_photo_url: string | null;
  pan_document_path: string | null;
  certificate_paths: string[] | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
};

type AstrologerRow = {
  id: string;
  name: string;
  image: string | null;
  experience: string;
  languages: string[];
  skills: string[];
  rating: number | string;
  consultations: number;
  price_per_minute: number | string;
  status: 'ONLINE' | 'BUSY' | 'OFFLINE';
  about: string | null;
};

const applicationSelect = [
  'id', 'user_id', 'status', 'legal_name', 'display_name', 'email', 'phone',
  'pan_number', 'experience_years', 'languages', 'skills', 'qualification',
  'consultation_modes', 'about', 'requested_price_per_minute',
  'profile_photo_url', 'pan_document_path', 'certificate_paths',
  'rejection_reason', 'submitted_at', 'reviewed_at',
].join(',');

const astrologerSelect = [
  'id', 'name', 'image', 'experience', 'languages', 'skills', 'rating',
  'consultations', 'price_per_minute', 'status', 'about',
].join(',');

function mapApplication(row: ApplicationRow): AstrologerApplication {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    legalName: row.legal_name ?? '',
    displayName: row.display_name ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
    panNumber: row.pan_number ?? '',
    experienceYears: row.experience_years,
    languages: row.languages ?? [],
    skills: row.skills ?? [],
    qualification: row.qualification ?? '',
    consultationModes: row.consultation_modes ?? [],
    about: row.about ?? '',
    requestedPricePerMinute: row.requested_price_per_minute === null
      ? null
      : Number(row.requested_price_per_minute),
    profilePhotoUrl: row.profile_photo_url ?? '',
    panDocumentPath: row.pan_document_path ?? '',
    certificatePaths: row.certificate_paths ?? [],
    rejectionReason: row.rejection_reason ?? '',
    submittedAt: row.submitted_at ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
  };
}

function mapAstrologer(row: AstrologerRow): Astrologer {
  return {
    id: row.id,
    name: row.name,
    image: row.image ?? '',
    experience: row.experience,
    languages: row.languages,
    skills: row.skills,
    rating: Number(row.rating),
    consultations: row.consultations,
    pricePerMinute: Number(row.price_per_minute),
    isOnline: row.status === 'ONLINE',
    about: row.about ?? '',
  };
}

function applicationPayload(draft: AstrologerApplicationDraft) {
  return {
    legal_name: draft.legalName.trim(),
    display_name: draft.displayName.trim(),
    email: draft.email.trim().toLowerCase(),
    phone: draft.phone.trim(),
    pan_number: draft.panNumber.trim().toUpperCase(),
    experience_years: draft.experienceYears,
    languages: draft.languages,
    skills: draft.skills,
    qualification: draft.qualification.trim(),
    consultation_modes: draft.consultationModes,
    about: draft.about.trim(),
    requested_price_per_minute: draft.requestedPricePerMinute,
    profile_photo_url: draft.profilePhotoUrl,
    pan_document_path: draft.panDocumentPath,
    certificate_paths: draft.certificatePaths,
  };
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Please sign in again to continue.');
  return data.user.id;
}

function fileExtension(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  if (file.type === 'application/pdf') return 'pdf';
  return 'bin';
}

async function uploadOwnedFile(
  bucket: string,
  file: File,
  allowedTypes: readonly string[],
  maxBytes: number,
): Promise<string> {
  if (!allowedTypes.includes(file.type)) throw new Error('This file type is not supported.');
  if (file.size > maxBytes) throw new Error('The selected file is larger than the allowed limit.');

  const userId = await requireUserId();
  const path = `${userId}/${crypto.randomUUID()}.${fileExtension(file)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });
  if (error) throw new Error(error.message);
  return path;
}

export const astrologerPartnerService = {
  async getApplication(): Promise<AstrologerApplication | null> {
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from('astrologer_applications')
      .select(applicationSelect)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapApplication(data as unknown as ApplicationRow) : null;
  },

  async saveDraft(draft: AstrologerApplicationDraft): Promise<AstrologerApplication> {
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from('astrologer_applications')
      .upsert({
        user_id: userId,
        status: 'draft',
        rejection_reason: null,
        reviewed_at: null,
        submitted_at: null,
        ...applicationPayload(draft),
      }, { onConflict: 'user_id' })
      .select(applicationSelect)
      .single();
    if (error) throw new Error(error.message);
    return mapApplication(data as unknown as ApplicationRow);
  },

  async submit(draft: AstrologerApplicationDraft): Promise<AstrologerApplication> {
    const saved = await this.saveDraft(draft);
    const { data, error } = await supabase
      .from('astrologer_applications')
      .update({ status: 'pending', submitted_at: new Date().toISOString() })
      .eq('id', saved.id)
      .eq('status', 'draft')
      .select(applicationSelect)
      .single();
    if (error) throw new Error(error.message);
    return mapApplication(data as unknown as ApplicationRow);
  },

  async getPublicDirectory(): Promise<Astrologer[]> {
    const { data, error } = await supabase
      .from('astrologers')
      .select(astrologerSelect)
      .order('rating', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(row => mapAstrologer(row as unknown as AstrologerRow));
  },

  async getMyPublicProfile(): Promise<Astrologer | null> {
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from('astrologers')
      .select(astrologerSelect)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapAstrologer(data as unknown as AstrologerRow) : null;
  },

  async updatePublicProfile(draft: AstrologerPublicProfileDraft): Promise<Astrologer> {
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from('astrologers')
      .update({
        name: draft.name.trim(),
        image: draft.image,
        experience: draft.experience.trim(),
        languages: draft.languages,
        skills: draft.skills,
        about: draft.about.trim(),
      })
      .eq('user_id', userId)
      .select(astrologerSelect)
      .single();
    if (error) throw new Error(error.message);
    return mapAstrologer(data as unknown as AstrologerRow);
  },

  async uploadProfilePhoto(file: File): Promise<string> {
    const path = await uploadOwnedFile(
      'astrologer-profile-photos',
      file,
      ASTROLOGER_UPLOAD_LIMITS.imageTypes,
      ASTROLOGER_UPLOAD_LIMITS.profilePhotoBytes,
    );
    return supabase.storage.from('astrologer-profile-photos').getPublicUrl(path).data.publicUrl;
  },

  async uploadVerificationDocument(file: File): Promise<string> {
    return uploadOwnedFile(
      'astrologer-verification',
      file,
      ASTROLOGER_UPLOAD_LIMITS.documentTypes,
      ASTROLOGER_UPLOAD_LIMITS.verificationDocumentBytes,
    );
  },
};
