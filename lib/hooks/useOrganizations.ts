'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type Organization = Database['public']['Tables']['organizations']['Row']

export function useOrganizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    try {
      setError(null)
      
      // Check if user is authenticated using getSession instead of getUser
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Session error:', sessionError)
        throw new Error(`Authentication error: ${sessionError.message}`)
      }

      const user = session?.user

      console.log('Fetching orgs for user:', user?.id)

      if (!user) {
        console.log('No user found - not authenticated')
        setOrganizations([])
        setLoading(false)
        return
      }

      // Fetch organization memberships
      const { data: memberships, error: membershipsError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)

      console.log('Memberships:', memberships)
      console.log('Memberships error:', membershipsError)

      if (membershipsError) {
        throw new Error(`Memberships error: ${membershipsError.message}`)
      }

      if (!memberships || memberships.length === 0) {
        console.log('No organization memberships found')
        setOrganizations([])
        setLoading(false)
        return
      }

      // Get organization IDs
      const orgIds = memberships.map(m => m.organization_id)
      console.log('Organization IDs:', orgIds)

      // Fetch organizations
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .in('id', orgIds)

      console.log('Organizations:', orgs)
      console.log('Organizations error:', orgsError)

      if (orgsError) {
        throw new Error(`Organizations error: ${orgsError.message}`)
      }

      setOrganizations(orgs || [])
    } catch (err: any) {
      console.error('Error fetching organizations:', err)
      setError(err.message || 'Failed to fetch organizations')
    } finally {
      setLoading(false)
    }
  }

  const createOrganization = async (name: string) => {
    try {
      setError(null)
      
      // Use getSession instead of getUser
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        throw new Error(`Authentication error: ${sessionError.message}`)
      }

      const user = session?.user

      if (!user) {
        throw new Error('Not authenticated')
      }

      console.log('Creating organization:', name)

      // Insert organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({ name, created_by: user.id })
        .select()
        .single()

      console.log('Created org:', org)
      console.log('Org error:', orgError)

      if (orgError) {
        throw new Error(`Create org error: ${orgError.message}`)
      }

      // Add user as admin member
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: 'admin',
        })

      console.log('Member error:', memberError)

      if (memberError) {
        throw new Error(`Add member error: ${memberError.message}`)
      }

      await fetchOrganizations()
      return org
    } catch (err: any) {
      console.error('Error creating organization:', err)
      setError(err.message || 'Failed to create organization')
      throw err
    }
  }

  return {
    organizations,
    loading,
    error,
    createOrganization,
    refetch: fetchOrganizations,
  }
}